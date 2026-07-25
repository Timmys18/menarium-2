import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "./utils";

describe("safeCallbackUrl", () => {
  it("keeps an internal destination with its query string", () => {
    expect(safeCallbackUrl("/exchange?tab=incoming&swap=swap_1")).toBe(
      "/exchange?tab=incoming&swap=swap_1",
    );
  });

  it.each([
    "https://example.com/phishing",
    "//example.com/phishing",
    "/\\example.com/phishing",
    "javascript:alert(1)",
  ])("falls back for an unsafe destination: %s", (value) => {
    expect(safeCallbackUrl(value, "/catalog")).toBe("/catalog");
  });
});
