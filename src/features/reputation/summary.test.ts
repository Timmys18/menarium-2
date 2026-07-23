import { describe, expect, it } from "vitest";
import { buildReputationSummary } from "./summary";

describe("buildReputationSummary", () => {
  it("does not overstate reputation from a single review", () => {
    const summary = buildReputationSummary(1, [{ rating: 5, count: 1 }]);

    expect(summary.averageRating).toBe(5);
    expect(summary.label).toBe("Репутация формируется");
  });

  it("builds a transparent rating distribution", () => {
    const summary = buildReputationSummary(8, [
      { rating: 5, count: 4 },
      { rating: 4, count: 2 },
      { rating: 2, count: 1 },
    ]);

    expect(summary.reviewCount).toBe(7);
    expect(summary.distribution).toEqual({ 1: 0, 2: 1, 3: 0, 4: 2, 5: 4 });
    expect(summary.positivePercentage).toBe(86);
  });

  it("distinguishes a new profile from completed exchanges without reviews", () => {
    expect(buildReputationSummary(0, []).label).toBe("Новая репутация");
    expect(buildReputationSummary(2, []).label).toBe("Первые отзывы впереди");
  });
});
