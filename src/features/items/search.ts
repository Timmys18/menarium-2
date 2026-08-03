import { Prisma } from "@prisma/client";
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

export async function findSearchItemIds(query: string): Promise<string[]> {
  const phrases = searchPhrases(query);
  if (phrases.length === 0) return [];

  const text = Prisma.sql`coalesce(i."title", '') || ' ' || coalesce(i."description", '') || ' ' || coalesce(array_to_string(i."desired", ' '), '') || ' ' || coalesce(i."category", '')`;
  const matches = Prisma.join(
    phrases.map(
      (phrase) => Prisma.sql`
        to_tsvector('russian', ${text}) @@ websearch_to_tsquery('russian', ${phrase})
        OR word_similarity(lower(${phrase}), lower(${text})) >= 0.42
        OR translate(lower(${text}), 'ё', 'е') LIKE '%' || lower(${phrase}) || '%'
        OR ${text} LIKE '%' || ${phrase} || '%'
      `,
    ),
    " OR ",
  );

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT i."id"
    FROM "Item" i
    INNER JOIN "User" u ON u."id" = i."ownerId"
    WHERE i."status" = 'ACTIVE' AND u."status" = 'ACTIVE' AND (${matches})
    ORDER BY
      GREATEST(${Prisma.join(phrases.map((phrase) => Prisma.sql`ts_rank_cd(to_tsvector('russian', ${text}), websearch_to_tsquery('russian', ${phrase}))`), ", ")}) DESC,
      i."updatedAt" DESC
    LIMIT 2000
  `);

  return rows.map((row) => row.id);
}
