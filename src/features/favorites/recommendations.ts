export type InterestSignal = {
  category: string;
  type: string;
  city: string;
  weight?: number;
};

export type InterestProfile = {
  categories: Record<string, number>;
  types: Record<string, number>;
  cities: Record<string, number>;
  signalCount: number;
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

function addWeight(target: Record<string, number>, value: string, weight: number) {
  const key = normalized(value);
  target[key] = (target[key] ?? 0) + weight;
}

export function buildInterestProfile(signals: InterestSignal[]): InterestProfile {
  const profile: InterestProfile = {
    categories: {},
    types: {},
    cities: {},
    signalCount: 0,
  };

  for (const signal of signals) {
    const weight = Math.max(1, signal.weight ?? 1);
    addWeight(profile.categories, signal.category, weight);
    addWeight(profile.types, signal.type, weight);
    addWeight(profile.cities, signal.city, weight);
    profile.signalCount += weight;
  }

  return profile;
}

export function scoreRecommendation(
  item: Pick<InterestSignal, "category" | "type" | "city">,
  profile: InterestProfile,
) {
  return (
    (profile.categories[normalized(item.category)] ?? 0) * 4 +
    (profile.types[normalized(item.type)] ?? 0) * 2 +
    (profile.cities[normalized(item.city)] ?? 0)
  );
}

export function getTopInterestLabels(profile: InterestProfile, limit = 3) {
  return Object.entries(profile.categories)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ru"))
    .slice(0, limit)
    .map(([label]) => label.charAt(0).toLocaleUpperCase("ru-RU") + label.slice(1));
}
