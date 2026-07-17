import { describe, expect, it } from "vitest";
import { clientProductEventSchema, normalizeAnalyticsPath } from "./events";

describe("normalizeAnalyticsPath", () => {
  it("keeps known static routes", () => {
    expect(normalizeAnalyticsPath("/catalog/")) .toBe("/catalog");
    expect(normalizeAnalyticsPath("/profile/chats")).toBe("/profile/chats");
  });

  it("removes identifiers from dynamic routes", () => {
    expect(normalizeAnalyticsPath("/item/secret-item-id")).toBe("/item/[id]");
    expect(normalizeAnalyticsPath("/item/secret-item-id/edit")).toBe("/item/[id]/edit");
    expect(normalizeAnalyticsPath("/user/secret-user-id")).toBe("/user/[id]");
  });

  it("collapses unknown paths instead of persisting their segments", () => {
    expect(normalizeAnalyticsPath("/invite/private-token")).toBe("/other");
    expect(normalizeAnalyticsPath(null)).toBe("/other");
  });
});

describe("clientProductEventSchema", () => {
  it("accepts only allowlisted event payloads", () => {
    const eventId = "d2bbcb60-3d8d-4f3d-9e0a-228e8a907ccc";
    expect(clientProductEventSchema.safeParse({ name: "page_view", path: "/catalog", eventId }).success).toBe(true);
    expect(clientProductEventSchema.safeParse({ name: "exchange_proposal_started", path: "/swipe", eventId }).success).toBe(true);
    expect(clientProductEventSchema.safeParse({ name: "page_view", path: "/catalog", eventId, email: "x@y.z" }).success).toBe(false);
    expect(clientProductEventSchema.safeParse({ name: "message_sent", path: "/exchange", eventId }).success).toBe(false);
  });
});
