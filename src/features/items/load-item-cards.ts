import { ItemStatus, ItemType, Prisma, UserStatus } from "@prisma/client";
import type { ItemCardView } from "@/features/items/presenters";
import { getPreviewItemCards } from "@/features/items/preview-cards";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { isDbUnavailableError } from "@/lib/db-unavailable";
import { prisma } from "@/lib/prisma";
import { CATALOG_PAGE_SIZE } from "@/features/items/catalog-url";

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
  const q = filters.q?.trim().toLowerCase();
  const category = filters.category?.trim();
  const city = filters.city?.trim().toLowerCase();

  return cards.filter((card) => {
    if (q && !card.title.toLowerCase().includes(q) && !card.wanted.toLowerCase().includes(q)) {
      return false;
    }
    if (category && card.category !== category) return false;
    if (city && card.city.toLowerCase() !== city) return false;
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
  const page = Math.max(1, input.page ?? 1);
  const pageSize = input.pageSize ?? CATALOG_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  try {
    const where: Prisma.ItemWhereInput = {
      status: ItemStatus.ACTIVE,
      owner: { status: UserStatus.ACTIVE },
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q, mode: "insensitive" as const } },
              { description: { contains: input.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(selectedCategory ? { category: selectedCategory } : {}),
      ...(input.city ? { city: { equals: input.city, mode: "insensitive" as const } } : {}),
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

    const [items, total, categoryRows, cityRows] = await Promise.all([
      prisma.item.findMany({ where, include: itemInclude, orderBy, skip: offset, take: pageSize }),
      prisma.item.count({ where }),
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

    const liveCategories = ["Все", ...categoryRows.map((entry) => entry.category)];
    return {
      cards: items.map((item) => toItemCardView(serializeItem(item), item._count.favorites)),
      preview: false,
      categoryList: liveCategories.length > 1 ? liveCategories : input.fallbackCategories,
      cityList: cityRows.map((entry) => entry.city),
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
