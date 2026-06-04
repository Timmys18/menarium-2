export type CatalogSort = "new" | "popular" | "trends";

export function parseCatalogSort(value?: string): CatalogSort {
  if (value === "popular" || value === "trends") return value;
  return "new";
}

export function buildCatalogHref(params: {
  q?: string;
  category?: string;
  city?: string;
  type?: string;
  sort?: CatalogSort;
}) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.category && params.category !== "Все") search.set("category", params.category);
  if (params.city?.trim()) search.set("city", params.city.trim());
  if (params.type) search.set("type", params.type);
  if (params.sort && params.sort !== "new") search.set("sort", params.sort);
  const query = search.toString();
  return query ? `/catalog?${query}` : "/catalog";
}
