import { describe, expect, it } from "vitest";
import { getInitialReviewVisibleAt, isReviewVisible } from "./policy";

describe("review publication policy", () => {
  it("keeps the first review blind for fourteen days", () => {
    const completedAt = new Date("2026-07-01T12:00:00.000Z");

    expect(getInitialReviewVisibleAt(completedAt).toISOString()).toBe("2026-07-15T12:00:00.000Z");
  });

  it("publishes a review once its visibility time arrives", () => {
    const visibleAt = new Date("2026-07-15T12:00:00.000Z");

    expect(isReviewVisible(visibleAt, new Date("2026-07-15T11:59:59.999Z"))).toBe(false);
    expect(isReviewVisible(visibleAt, new Date("2026-07-15T12:00:00.000Z"))).toBe(true);
  });
});
