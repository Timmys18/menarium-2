import { describe, expect, it } from "vitest";
import { sanitizeProductEventProperties } from "./product-analytics";

describe("sanitizeProductEventProperties", () => {
  it("limits keys and string lengths", () => {
    const result = sanitizeProductEventProperties({
      source: "x".repeat(100),
      "unsafe-key": "ignored",
      completed: true,
    });

    expect(result).toEqual({ source: "x".repeat(80), completed: true });
  });
});
