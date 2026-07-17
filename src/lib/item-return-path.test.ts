import { describe, expect, it } from "vitest";
import { parseItemReturnPath } from "./item-return-path";

describe("parseItemReturnPath", () => {
  it("accepts a direct internal item path", () => {
    expect(parseItemReturnPath("/item/clx_123-ABC")).toEqual({
      itemId: "clx_123-ABC",
      path: "/item/clx_123-ABC",
    });
  });

  it("uses the first query value", () => {
    expect(parseItemReturnPath(["/item/first", "/item/second"])?.itemId).toBe("first");
  });

  it.each([
    "https://example.com/item/1",
    "//example.com/item/1",
    "javascript:alert(1)",
    "/exchange",
    "/item/one?unexpected=true",
    "/item/one/two",
  ])("rejects an unsafe or unrelated path: %s", (value) => {
    expect(parseItemReturnPath(value)).toBeNull();
  });
});
