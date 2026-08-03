import { describe, expect, it } from "vitest";
import { searchPhrases } from "./search";

describe("searchPhrases", () => {
  it("understands the Russian and English names people use for the same thing", () => {
    expect(searchPhrases("айфон 15")).toEqual(expect.arrayContaining(["айфон 15", "iphone 15", "iphone"]));
    expect(searchPhrases("macbook air")).toEqual(expect.arrayContaining(["macbook air", "макбук air", "макбук"]));
  });

  it("keeps a blank search blank and limits excessively long input", () => {
    expect(searchPhrases("   ")).toEqual([]);
    expect(searchPhrases("а".repeat(200))[0]).toHaveLength(160);
  });

  it("treats е and ё as the same letter for a Russian search", () => {
    expect(searchPhrases("фотосъёмка")).toEqual(expect.arrayContaining(["фотосъемка", "Фотосъемка"]));
  });
});
