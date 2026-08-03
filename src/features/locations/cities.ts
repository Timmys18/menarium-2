import rawCities from "./russian-cities.json";

export type CityOption = {
  id: string;
  name: string;
  region: string;
  population: number;
  aliases: readonly string[];
};

type RawCity = {
  name: string;
  subject: string;
  population: number;
};

function cityId(name: string, region: string) {
  return `${name}-${region}`
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

const extraAliases: Record<string, readonly string[]> = {
  "санкт-петербург-санкт-петербург": ["спб", "питер", "ленинград"],
  "екатеринбург-свердловская-область": ["екб"],
  "нижний-новгород-нижегородская-область": ["нн"],
  "ростов-на-дону-ростовская-область": ["ростов"],
};

export const russianCities: readonly CityOption[] = (rawCities as RawCity[])
  .filter((city) => city.population >= 5_000)
  .map((city) => {
    const id = cityId(city.name, city.subject);
    return { id, name: city.name, region: city.subject, population: city.population, aliases: extraAliases[id] ?? [] };
  })
  .sort((left, right) => right.population - left.population || left.name.localeCompare(right.name, "ru"));

const cityById = new Map(russianCities.map((city) => [city.id, city]));

export function getCity(cityId: string | null | undefined): CityOption | null {
  return cityId ? cityById.get(cityId) ?? null : null;
}

export function findCityByName(value: string | null | undefined): CityOption | null {
  if (!value?.trim()) return null;
  const normalized = normalizeCitySearch(value);
  return russianCities.find((city) => normalizeCitySearch(city.name) === normalized || city.aliases.includes(normalized)) ?? null;
}

export function normalizeCitySearch(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim();
}

export function searchCities(query: string, limit = 12): CityOption[] {
  const normalized = normalizeCitySearch(query);
  if (!normalized) return russianCities.slice(0, limit);
  return russianCities
    .filter((city) => {
      const values = [city.name, city.region, ...city.aliases].map(normalizeCitySearch);
      return values.some((value) => value.startsWith(normalized) || value.includes(normalized));
    })
    .slice(0, limit);
}
