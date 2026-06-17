import { ItemStatus, ItemType, Prisma } from "@prisma/client";
import type { ItemCardView } from "@/features/items/presenters";
import { getPreviewItemCards } from "@/features/items/preview-cards";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { isDbUnavailableError } from "@/lib/db-unavailable";
import { prisma } from "@/lib/prisma";

const itemInclude = {
  owner: { select: { id: true, name: true, city: true, image: true } },
  images: true,
} as const;

export type ItemCardsLoadResult = {
  cards: ItemCardView[];
  preview: boolean;
  categoryList: string[];
  cityList: string[];
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
      where: { status: ItemStatus.ACTIVE },
      include: itemInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    return {
      cards: items.map((item) => toItemCardView(serializeItem(item))),
      preview: false,
    };
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
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
}): Promise<ItemCardsLoadResult> {
  const selectedCategory = input.category && input.category !== "Все" ? input.category : undefined;

  try {
    const where: Prisma.ItemWhereInput = {
      status: ItemStatus.ACTIVE,
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

    const orderBy =
      input.sort === "popular"
        ? { receivedSwaps: { _count: "desc" as const } }
        : input.sort === "trends"
          ? { updatedAt: "desc" as const }
          : { createdAt: "desc" as const };

    const [items, categoryRows, cityRows] = await Promise.all([
      prisma.item.findMany({ where, include: itemInclude, orderBy, take: 60 }),
      prisma.item.findMany({
        where: { status: ItemStatus.ACTIVE },
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      }),
      prisma.item.findMany({
        where: { status: ItemStatus.ACTIVE },
        distinct: ["city"],
        select: { city: true },
        orderBy: { city: "asc" },
      }),
    ]);

    const liveCategories = ["Все", ...categoryRows.map((entry) => entry.category)];
    return {
      cards: items.map((item) => toItemCardView(serializeItem(item))),
      preview: false,
      categoryList: liveCategories.length > 1 ? liveCategories : input.fallbackCategories,
      cityList: cityRows.map((entry) => entry.city),
    };
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;

    const meta = previewMeta();
    let cards = filterPreviewCards(getPreviewItemCards(), {
      q: input.q,
      category: selectedCategory,
      city: input.city,
    });

    if (input.sort === "popular") {
      cards = [...cards].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    }

    return {
      cards,
      preview: true,
      categoryList: meta.categoryList,
      cityList: meta.cityList,
    };
  }
}
