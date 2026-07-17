import { describe, expect, it } from "vitest";
import { getSafeNotificationHref } from "./href";

describe("getSafeNotificationHref", () => {
  it("keeps an internal notification destination", () => {
    expect(getSafeNotificationHref("/exchange?tab=incoming&swap=swap_1")).toBe(
      "/exchange?tab=incoming&swap=swap_1",
    );
  });

  it("moves a legacy item-thread notification to the dedicated chat", () => {
    expect(getSafeNotificationHref("/item/item_1?thread=thread_1")).toBe(
      "/profile/chats/item/thread_1",
    );
  });

  it.each([
    "https://example.com/phishing",
    "//example.com/phishing",
    "/\\example.com/phishing",
    "javascript:alert(1)",
  ])("rejects an external or executable destination: %s", (value) => {
    expect(getSafeNotificationHref(value)).toBeNull();
  });
});
