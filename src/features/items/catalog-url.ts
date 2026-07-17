export const CATALOG_PAGE_SIZE = 24;

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
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.category && params.category !== "Все") search.set("category", params.category);
  if (params.city?.trim()) search.set("city", params.city.trim());
  if (params.type) search.set("type", params.type);
  if (params.sort && params.sort !== "new") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/catalog?${query}` : "/catalog";
}

export function parseCatalogReturnHref(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith("/") || candidate.startsWith("//")) return null;

  try {
    const url = new URL(candidate, "https://menarium.internal");
    if (url.origin !== "https://menarium.internal" || url.pathname !== "/catalog") return null;

    const type = url.searchParams.get("type");
    return buildCatalogHref({
      q: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      city: url.searchParams.get("city") ?? undefined,
      type: type === "THING" || type === "SERVICE" ? type : undefined,
      sort: parseCatalogSort(url.searchParams.get("sort") ?? undefined),
      page: Math.max(1, Number(url.searchParams.get("page")) || 1),
    });
  } catch {
    return null;
  }
}
