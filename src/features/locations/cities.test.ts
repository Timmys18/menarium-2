import { describe, expect, it } from "vitest";
import { findCityByName, getCity, russianCities, searchCities } from "./cities";

describe("city reference", () => {
  it("contains a nationwide city list rather than a hand-picked set", () => {
    expect(russianCities.length).toBeGreaterThan(1_000);
    expect(getCity("москва-москва")?.name).toBe("Москва");
  });

  it("accepts common city aliases only as a way to find the canonical city", () => {
    expect(findCityByName("СПб")?.name).toBe("Санкт-Петербург");
    expect(searchCities("екб")[0]?.name).toBe("Екатеринбург");
  });
});
