import { describe, expect, it } from "vitest";
import { getSwapOfferExpiresAt, isSwapOfferExpired } from "./expiration";

describe("swap offer expiration", () => {
  it("gives a new offer seven days for a response", () => {
    const createdAt = new Date("2026-07-17T09:30:00.000Z");

    expect(getSwapOfferExpiresAt(createdAt).toISOString()).toBe("2026-07-24T09:30:00.000Z");
  });

  it("treats the exact deadline as expired", () => {
    const expiresAt = new Date("2026-07-24T09:30:00.000Z");

    expect(isSwapOfferExpired(expiresAt, new Date("2026-07-24T09:29:59.999Z"))).toBe(false);
    expect(isSwapOfferExpired(expiresAt, new Date("2026-07-24T09:30:00.000Z"))).toBe(true);
  });
});
