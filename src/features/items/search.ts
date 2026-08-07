import { ItemType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const synonyms: Record<string, readonly string[]> = {
  "айфон": ["iphone"],
  "iphone": ["айфон"],
  "макбук": ["macbook"],
  "macbook": ["макбук"],
  "наушники": ["headphones"],
  "headphones": ["наушники"],
  "телефон": ["смартфон"],
  "смартфон": ["телефон"],
  "ноут": ["ноутбук"],
  "ноутбук": ["ноут"],
  "телевизор": ["тв"],
  "тв": ["телевизор"],
};

export function searchPhrases(query: string): string[] {
  // Keep search broad without allowing an unbounded query to make the catalog slow.
  const normalized = query.trim().slice(0, 160).toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
  if (!normalized) return [];
  const words = normalized.match(/[a-zа-яё0-9+-]+/gi) ?? [];
  const expanded = new Set<string>();
  const addPhrase = (value: string) => {
    expanded.add(value);
    expanded.add(`${value.slice(0, 1).toLocaleUpperCase("ru-RU")}${value.slice(1)}`);
  };

  addPhrase(normalized);
  for (const word of words) {
    for (const synonym of synonyms[word] ?? []) {
      addPhrase(words.map((entry) => (entry === word ? synonym : entry)).join(" "));
      addPhrase(synonym);
    }
  }
  return [...expanded].slice(0, 8);
}

export type SearchItemPageInput = {
  categoryIds?: string[];
  categoryLabels?: string[];
  cityId?: string;
  cityName?: string;
  type?: ItemType;
  acceptsAnything?: boolean;
  sort?: "new" | "popular" | "trends";
  offset: number;
  limit: number;
};

export type SearchItemPage = {
  ids: string[];
  total: number;
};

/**
 * Search, filtering, relevance, pagination and the total are deliberately one
 * database query. Returning a giant ID list first makes totals lie and loses
 * relevance ordering as the catalog grows.
 */
export async function findSearchItemPage(
  query: string,
  input: SearchItemPageInput,
): Promise<SearchItemPage> {
  const phrases = searchPhrases(query);
  if (phrases.length === 0) return { ids: [], total: 0 };

  const matches = Prisma.join(
    phrases.map(
      (phrase) => Prisma.sql`
        i."searchVector" @@ websearch_to_tsquery('russian', ${phrase})
        OR i."searchText" %> lower(${phrase})
      `,
    ),
    " OR ",
  );

  const filters: Prisma.Sql[] = [
    Prisma.sql`i."status" = 'ACTIVE'`,
    Prisma.sql`u."status" = 'ACTIVE'`,
    Prisma.sql`(${matches})`,
  ];
  if (input.categoryIds?.length || input.categoryLabels?.length) {
    const categoryFilters: Prisma.Sql[] = [];
    if (input.categoryIds?.length) categoryFilters.push(Prisma.sql`i."categoryId" IN (${Prisma.join(input.categoryIds)})`);
    if (input.categoryLabels?.length) categoryFilters.push(Prisma.sql`i."category" IN (${Prisma.join(input.categoryLabels)})`);
    filters.push(Prisma.sql`(${Prisma.join(categoryFilters, " OR ")})`);
  }
  if (input.cityId || input.cityName) {
    const cityFilters: Prisma.Sql[] = [];
    if (input.cityId) cityFilters.push(Prisma.sql`i."cityId" = ${input.cityId}`);
    if (input.cityName) cityFilters.push(Prisma.sql`i."city" ILIKE ${input.cityName}`);
    filters.push(Prisma.sql`(${Prisma.join(cityFilters, " OR ")})`);
  }
  if (input.type) filters.push(Prisma.sql`i."type" = ${input.type}`);
  if (input.acceptsAnything) filters.push(Prisma.sql`i."acceptsAnything" = true`);

  const score = Prisma.join(
    phrases.map((phrase) => Prisma.sql`ts_rank_cd(i."searchVector", websearch_to_tsquery('russian', ${phrase}))`),
    ", ",
  );
  const orderBy =
    input.sort === "popular"
      ? Prisma.sql`"popularity" DESC, "score" DESC, "updatedAt" DESC`
      : input.sort === "trends"
        ? Prisma.sql`"updatedAt" DESC, "score" DESC`
        : Prisma.sql`"score" DESC, "updatedAt" DESC`;

  const rows = await prisma.$queryRaw<Array<{ id: string; total: bigint }>>(Prisma.sql`
    WITH matches AS (
      SELECT
        i."id",
        i."updatedAt",
        GREATEST(${score}) AS "score",
        (SELECT count(*) FROM "Favorite" f WHERE f."itemId" = i."id") AS "popularity"
      FROM "Item" i
      INNER JOIN "User" u ON u."id" = i."ownerId"
      WHERE ${Prisma.join(filters, " AND ")}
    )
    SELECT "id", count(*) OVER () AS "total"
    FROM matches
    ORDER BY ${orderBy}
    LIMIT ${input.limit} OFFSET ${input.offset}
  `);

  return { ids: rows.map((row) => row.id), total: rows[0] ? Number(rows[0].total) : 0 };
}
