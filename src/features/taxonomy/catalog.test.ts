import { describe, expect, it } from "vitest";
import { categoryLabel, categoryOptions, categoryRoot, categoryScope, findCategory } from "./catalog";

describe("catalog taxonomy", () => {
  it("keeps categories broad enough to understand and specific enough to filter", () => {
    expect(categoryLabel("thing.electronics.phones")).toBe("Смартфоны");
    expect(categoryLabel("service.education.languages")).toBe("Иностранные языки");
    expect(findCategory("iphone-15")).toBeNull();
  });

  it("offers separate, complete branches for things and services", () => {
    expect(categoryOptions("THING").some((category) => category.label === "Электроника")).toBe(true);
    expect(categoryOptions("SERVICE").some((category) => category.label === "Обучение")).toBe(true);
  });

  it("finds the broad category for a selected subcategory", () => {
    expect(categoryRoot("thing.electronics.phones")?.label).toBe("Электроника");
    expect(categoryRoot("service.photo-events")?.label).toBe("Фото, видео и события");
  });

  it("expands a broad category to every nested category and legacy label", () => {
    expect(categoryScope("thing.electronics").ids).toContain("thing.electronics.photo-video");
    expect(categoryScope("thing.electronics").labels).toEqual(expect.arrayContaining(["Фото и видео", "Фото"]));
    expect(categoryScope("thing.electronics.photo-video").ids).toEqual(["thing.electronics.photo-video"]);
  });
});
