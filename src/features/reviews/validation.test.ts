import { describe, expect, it } from "vitest";
import { createReviewSchema } from "./validation";

describe("createReviewSchema", () => {
  it("accepts a rating with an optional concise comment", () => {
    expect(createReviewSchema.parse({ rating: 5, comment: "  Всё прошло отлично  " })).toEqual({
      rating: 5,
      comment: "Всё прошло отлично",
    });
  });

  it("rejects ratings outside the five-star scale", () => {
    expect(createReviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(createReviewSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it("turns an empty comment into an omitted value", () => {
    expect(createReviewSchema.parse({ rating: 4, comment: "  " })).toEqual({
      rating: 4,
      comment: undefined,
    });
  });
});
