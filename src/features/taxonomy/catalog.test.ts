import { describe, expect, it } from "vitest";
import { categoryLabel, categoryOptions, findCategory } from "./catalog";

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
});
