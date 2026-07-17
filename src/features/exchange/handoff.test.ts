import { describe, expect, it } from "vitest";
import { handoffActionSchema, isHandoffScheduleAllowed } from "./handoff";

describe("handoff plan", () => {
  it("accepts a structured meeting plan", () => {
    expect(
      handoffActionSchema.parse({
        action: "save",
        mode: "IN_PERSON",
        scheduledAt: "2026-07-20T12:00:00.000Z",
        details: "  У главного входа в парк  ",
        revision: 2,
      }),
    ).toEqual({
      action: "save",
      mode: "IN_PERSON",
      scheduledAt: "2026-07-20T12:00:00.000Z",
      details: "У главного входа в парк",
      revision: 2,
    });
  });

  it("rejects an empty or oversized plan", () => {
    expect(
      handoffActionSchema.safeParse({
        action: "save",
        mode: "ONLINE",
        scheduledAt: "2026-07-20T12:00:00.000Z",
        details: " ",
        revision: 0,
      }).success,
    ).toBe(false);
  });

  it("allows a practical scheduling window", () => {
    const now = new Date("2026-07-17T12:00:00.000Z");

    expect(isHandoffScheduleAllowed(new Date("2026-07-17T11:50:00.000Z"), now)).toBe(true);
    expect(isHandoffScheduleAllowed(new Date("2026-07-17T11:40:00.000Z"), now)).toBe(false);
    expect(isHandoffScheduleAllowed(new Date("2027-02-01T12:00:00.000Z"), now)).toBe(false);
  });
});
