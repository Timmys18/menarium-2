import { ItemStatus, ItemType, Prisma, UserStatus } from "@prisma/client";
import type { ItemCardView } from "@/features/items/presenters";
import { getPreviewItemCards } from "@/features/items/preview-cards";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { isDbUnavailableError } from "@/lib/db-unavailable";
import { prisma } from "@/lib/prisma";
import { CATALOG_PAGE_SIZE } from "@/features/items/catalog-url";
import { categoryScope } from "@/features/taxonomy/catalog";
import { getCity } from "@/features/locations/cities";
import { findSearchItemPage, searchPhrases } from "@/features/items/search";
import { getRedis } from "@/lib/redis";

// Демо-карточки при недоступной БД показываем ТОЛЬКО вне production.
// В production поломка БД должна честно приводить к ошибке (error.tsx),
// а не маскироваться фейковыми объявлениями с нерабочими ссылками.
function canUsePreviewFallback(error: unknown): boolean {
  return process.env.NODE_ENV !== "production" && isDbUnavailableError(error);
}

const itemInclude = {
  owner: { select: { id: true, name: true, city: true, image: true } },
  images: true,
  _count: { select: { favorites: true } },
} as const;

const CATALOG_FACETS_CACHE_KEY = "menarium:catalog:facets:v1";
const CATALOG_FACETS_CACHE_TTL_SECONDS = 10 * 60;

type CatalogFacets = {
  categories: string[];
  cities: string[];
};

function parseCatalogFacets(value: string | null): CatalogFacets | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as CatalogFacets).categories) ||
      !Array.isArray((parsed as CatalogFacets).cities)
    ) {
      return null;
    }

    return {
      categories: (parsed as CatalogFacets).categories.filter((value): value is string => typeof value === "string"),
      cities: (parsed as CatalogFacets).cities.filter((value): value is string => typeof value === "string"),
    };
  } catch {
    return null;
  }
}

async function loadCatalogFacets(): Promise<CatalogFacets> {
  let redis: ReturnType<typeof getRedis> = null;

  try {
    redis = getRedis();
    const cached = parseCatalogFacets(redis ? await redis.get(CATALOG_FACETS_CACHE_KEY) : null);
    if (cached) return cached;
  } catch {
    // The catalog remains available if the optional cache is temporarily unavailable.
  }

  const [categoryRows, cityRows] = await Promise.all([
    prisma.item.findMany({
      where: { status: ItemStatus.ACTIVE, owner: { status: UserStatus.ACTIVE } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.item.findMany({
      where: { status: ItemStatus.ACTIVE, owner: { status: UserStatus.ACTIVE } },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    }),
  ]);
  const facets = {
    categories: categoryRows.map((entry) => entry.category),
    cities: cityRows.map((entry) => entry.city),
  };

  if (redis) {
    void redis.set(CATALOG_FACETS_CACHE_KEY, JSON.stringify(facets), "EX", CATALOG_FACETS_CACHE_TTL_SECONDS).catch(() => undefined);
  }

  return facets;
}

export type ItemCardsLoadResult = {
  cards: ItemCardView[];
  preview: boolean;
  categoryList: string[];
  cityList: string[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function filterPreviewCards(
  cards: ItemCardView[],
  filters: { q?: string; category?: string; city?: string },
) {
  const phrases = searchPhrases(filters.q ?? "");
  const category = categoryScope(filters.category?.trim());
  const city = getCity(filters.city)?.name.toLocaleLowerCase("ru-RU");

  return cards.filter((card) => {
    const searchText = `${card.title} ${card.wanted} ${card.category}`.toLocaleLowerCase("ru-RU");
    if (phrases.length > 0 && !phrases.some((phrase) => searchText.includes(phrase))) {
      return false;
    }
    if (category.ids.length > 0 && !category.labels.includes(card.category)) return false;
    if (city && card.city.toLocaleLowerCase("ru-RU") !== city) return false;
    return true;
  });
}

function previewMeta() {
  const cards = getPreviewItemCards();
  const categoryList = ["Все", ...new Set(cards.map((c) => c.category))];
  const cityList = [...new Set(cards.map((c) => c.city))].sort((a, b) => a.localeCompare(b, "ru"));
  return { categoryList, cityList };
}

export async function loadHomeItemCards(): Promise<Pick<ItemCardsLoadResult, "cards" | "preview">> {
  try {
    const items = await prisma.item.findMany({
      where: { status: ItemStatus.ACTIVE, owner: { status: UserStatus.ACTIVE } },
      include: itemInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    return {
      cards: items.map((item) => toItemCardView(serializeItem(item), item._count.favorites)),
      preview: false,
    };
  } catch (error) {
    if (!canUsePreviewFallback(error)) throw error;
    return { cards: getPreviewItemCards().slice(0, 6), preview: true };
  }
}

export async function loadCatalogItemCards(input: {
  q?: string;
  category?: string;
  city?: string;
  type?: ItemType;
  sort: "new" | "popular" | "trends";
  fallbackCategories: string[];
  page?: number;
  pageSize?: number;
}): Promise<ItemCardsLoadResult> {
  const selectedCategory = input.category && input.category !== "Все" ? input.category : undefined;
  const selectedCategoryScope = categoryScope(selectedCategory);
  const selectedCity = getCity(input.city);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = input.pageSize ?? CATALOG_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  try {
    const searchPage = input.q
      ? await findSearchItemPage(input.q, {
          categoryIds: selectedCategoryScope.ids,
          categoryLabels: selectedCategoryScope.labels,
          cityId: input.city,
          cityName: selectedCity?.name,
          type: input.type,
          sort: input.sort,
          offset,
          limit: pageSize,
        })
      : undefined;
    const conditions: Prisma.ItemWhereInput[] = [
      ...(searchPage ? [{ id: { in: searchPage.ids } }] : []),
      ...(selectedCategory
        ? [{ OR: [{ categoryId: { in: selectedCategoryScope.ids } }, { category: { in: selectedCategoryScope.labels } }] }]
        : []),
      ...(input.city
        ? [{ OR: [{ cityId: input.city }, ...(selectedCity ? [{ city: { equals: selectedCity.name, mode: "insensitive" as const } }] : [])] }]
        : []),
    ];
    const where: Prisma.ItemWhereInput = {
      status: ItemStatus.ACTIVE,
      owner: { status: UserStatus.ACTIVE },
      ...(conditions.length ? { AND: conditions } : {}),
      ...(input.type ? { type: input.type } : {}),
    };

    const orderBy: Prisma.ItemOrderByWithRelationInput[] =
      input.sort === "popular"
        ? [
            { favorites: { _count: "desc" } },
            { receivedSwaps: { _count: "desc" } },
            { createdAt: "desc" },
          ]
        : input.sort === "trends"
          ? [{ updatedAt: "desc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];

    const [loadedItems, total, facets] = await Promise.all([
      prisma.item.findMany({ where, include: itemInclude, orderBy, skip: searchPage ? 0 : offset, take: pageSize }),
      searchPage ? Promise.resolve(searchPage.total) : prisma.item.count({ where }),
      loadCatalogFacets(),
    ]);
    const items = searchPage
      ? searchPage.ids.map((id) => loadedItems.find((item) => item.id === id)).filter((item): item is (typeof loadedItems)[number] => Boolean(item))
      : loadedItems;

    const liveCategories = ["Все", ...facets.categories];
    return {
      cards: items.map((item) => toItemCardView(serializeItem(item), item._count.favorites)),
      preview: false,
      categoryList: liveCategories.length > 1 ? liveCategories : input.fallbackCategories,
      cityList: facets.cities,
      total,
      page,
      pageSize,
      hasMore: offset + items.length < total,
    };
  } catch (error) {
    if (!canUsePreviewFallback(error)) throw error;

    const meta = previewMeta();
    let cards = filterPreviewCards(getPreviewItemCards(), {
      q: input.q,
      category: selectedCategory,
      city: input.city,
    });

    if (input.sort === "popular") {
      cards = [...cards].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    }

    const total = cards.length;
    const paged = cards.slice(offset, offset + pageSize);

    return {
      cards: paged,
      preview: true,
      categoryList: meta.categoryList,
      cityList: meta.cityList,
      total,
      page,
      pageSize,
      hasMore: offset + paged.length < total,
    };
  }
}
