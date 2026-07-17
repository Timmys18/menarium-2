import { describe, expect, it } from "vitest";
import {
  buildInterestProfile,
  getTopInterestLabels,
  scoreRecommendation,
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
});
