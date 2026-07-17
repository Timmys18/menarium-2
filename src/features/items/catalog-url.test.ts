import { describe, expect, it } from "vitest";
import { buildCatalogHref, parseCatalogReturnHref, parseCatalogSort } from "./catalog-url";

describe("buildCatalogHref", () => {
  it("returns plain catalog path without filters", () => {
    expect(buildCatalogHref({})).toBe("/catalog");
  });

  it("preserves search query and category together", () => {
    expect(
      buildCatalogHref({
        q: "camera",
        category: "Фото",
        city: "Москва",
      }),
    ).toBe("/catalog?q=camera&category=%D0%A4%D0%BE%D1%82%D0%BE&city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0");
  });

  it("ignores empty category sentinel", () => {
    expect(buildCatalogHref({ category: "Все", q: "bike" })).toBe("/catalog?q=bike");
  });

  it("preserves non-default sort", () => {
    expect(buildCatalogHref({ sort: "popular", city: "Казань" })).toBe(
      "/catalog?city=%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%8C&sort=popular",
    );
  });
});

describe("parseCatalogSort", () => {
  it("defaults invalid values to new", () => {
    expect(parseCatalogSort(undefined)).toBe("new");
    expect(parseCatalogSort("unknown")).toBe("new");
  });

  it("accepts supported sort keys", () => {
    expect(parseCatalogSort("trends")).toBe("trends");
    expect(parseCatalogSort("popular")).toBe("popular");
  });
});

describe("parseCatalogReturnHref", () => {
  it("preserves a valid catalog context", () => {
    expect(parseCatalogReturnHref("/catalog?q=camera&city=Москва&sort=popular&page=2")).toBe(
      "/catalog?q=camera&city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0&sort=popular&page=2",
    );
  });

  it("rejects external and unrelated paths", () => {
    expect(parseCatalogReturnHref("//example.com/catalog")).toBeNull();
    expect(parseCatalogReturnHref("/profile")).toBeNull();
  });

  it("drops unsupported catalog parameters", () => {
    expect(parseCatalogReturnHref("/catalog?admin=1&type=UNKNOWN")).toBe("/catalog");
  });
});
