import { describe, expect, it } from "vitest";
import {
  buildInterestProfile,
  getRecommendationReasons,
  getRelatedItemReason,
  getTopDesiredLabels,
  getTopInterestLabels,
  scoreRecommendation,
  selectDiverseRecommendations,
} from "./recommendations";

describe("favorite recommendations", () => {
  const profile = buildInterestProfile([
    { category: "Техника", type: "THING", city: "Москва", weight: 2 },
    { category: "Книги", type: "THING", city: "Москва" },
  ]);

  it("gives the strongest weight to a matching category", () => {
    const closeMatch = scoreRecommendation(
      { category: "Техника", type: "THING", city: "Казань" },
      profile,
    );
    const cityOnly = scoreRecommendation(
      { category: "Спорт", type: "SERVICE", city: "Москва" },
      profile,
    );

    expect(closeMatch).toBeGreaterThan(cityOnly);
  });

  it("returns the most frequent interests first", () => {
    expect(getTopInterestLabels(profile)).toEqual(["Техника", "Книги"]);
  });

  it("prioritizes what the user explicitly wants to receive", () => {
    const exchangeProfile = buildInterestProfile([
      {
        category: "Техника",
        type: "THING",
        city: "Москва",
        title: "Механическая клавиатура",
        desired: ["Плёночная камера"],
        source: "owned",
      },
    ]);
    const camera = {
      title: "Canon AE-1, плёночная камера",
      description: "Рабочая камера",
      category: "Фото",
      type: "THING",
      city: "Санкт-Петербург",
      desired: ["Клавиатура"],
    };

    expect(scoreRecommendation(camera, exchangeProfile)).toBeGreaterThan(
      scoreRecommendation(
        {
          title: "Настольная лампа",
          category: "Дом",
          type: "THING",
          city: "Москва",
        },
        exchangeProfile,
      ),
    );
    expect(getTopDesiredLabels(exchangeProfile)).toContain("Плёночная камера");
    expect(getTopDesiredLabels(exchangeProfile)).not.toContain("Камера");
    expect(getRecommendationReasons(camera, exchangeProfile)).toContain(
      "Владельцу может подойти ваш вариант",
    );
  });

  it("keeps the final selection diverse by owner and category", () => {
    const items = Array.from({ length: 7 }, (_, index) => ({
      id: String(index),
      ownerId: index < 4 ? "same-owner" : `owner-${index}`,
      category: index < 5 ? "Техника" : "Дом",
    }));

    const selected = selectDiverseRecommendations(items, 5);

    expect(selected.filter((item) => item.ownerId === "same-owner")).toHaveLength(2);
    expect(new Set(selected.map((item) => item.ownerId)).size).toBeGreaterThan(2);
  });

  it("does not claim a mutual fit when the user has nothing active to offer", () => {
    const favoritesOnly = buildInterestProfile([
      {
        title: "Плёночная камера",
        category: "Фото",
        type: "THING",
        city: "Москва",
        source: "favorite",
      },
    ]);

    expect(
      getRecommendationReasons(
        {
          title: "Виниловые пластинки",
          category: "Музыка",
          type: "THING",
          city: "Москва",
          acceptsAnything: true,
        },
        favoritesOnly,
      ),
    ).not.toContain("Владельцу может подойти ваш вариант");
  });

  it("explains related items in plain language", () => {
    const source = { category: "Фото", type: "THING", city: "Москва" };

    expect(
      getRelatedItemReason(
        { category: "Фото", type: "THING", city: "Москва" },
        source,
      ),
    ).toBe("Похожий вариант в том же городе");
    expect(
      getRelatedItemReason(
        { category: "Фото", type: "THING", city: "Казань" },
        source,
      ),
    ).toBe("Ещё в категории «Фото»");
  });

  it("puts a likely mutual exchange above generic similarity", () => {
    expect(
      getRelatedItemReason(
        { category: "Дом", type: "THING", city: "Казань" },
        { category: "Фото", type: "THING", city: "Москва" },
        ["Владельцу может подойти ваш вариант", "Ещё одна вещь"],
      ),
    ).toBe("Владельцу может подойти ваш вариант");
  });
});
