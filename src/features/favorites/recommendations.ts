export type InterestSignal = {
  category: string;
  type: string;
  city: string;
  title?: string;
  desired?: string[];
  acceptsAnything?: boolean;
  source?: "favorite" | "owned";
  weight?: number;
};

export type InterestProfile = {
  categories: Record<string, number>;
  types: Record<string, number>;
  cities: Record<string, number>;
  desiredTerms: Record<string, number>;
  offeredTerms: Record<string, number>;
  signalCount: number;
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

const stopWords = new Set(["для", "или", "это", "что", "любой", "любое", "любая", "обмен"]);

function termVariants(value: string) {
  const full = normalized(value);
  const words = full
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3 && !stopWords.has(word));
  return [...new Set([...(full.length >= 3 ? [full] : []), ...words])];
}

function addWeight(target: Record<string, number>, value: string, weight: number) {
  const key = normalized(value);
  if (!key) return;
  target[key] = (target[key] ?? 0) + weight;
}

function addTerms(target: Record<string, number>, values: string[], weight: number) {
  for (const value of values) {
    for (const term of termVariants(value)) addWeight(target, term, weight);
  }
}

export function buildInterestProfile(signals: InterestSignal[]): InterestProfile {
  const profile: InterestProfile = {
    categories: {},
    types: {},
    cities: {},
    desiredTerms: {},
    offeredTerms: {},
    signalCount: 0,
  };

  for (const signal of signals) {
    const weight = Math.max(1, signal.weight ?? 1);
    addWeight(profile.categories, signal.category, weight);
    addWeight(profile.types, signal.type, weight);
    addWeight(profile.cities, signal.city, weight);

    if (signal.source === "owned") {
      addTerms(profile.desiredTerms, signal.desired ?? [], weight * 3);
      addTerms(profile.offeredTerms, [signal.title ?? "", signal.category], weight * 2);
    } else if (signal.source === "favorite") {
      addTerms(profile.desiredTerms, [signal.title ?? "", signal.category], weight * 2);
    }

    profile.signalCount += weight;
  }

  return profile;
}

export type RecommendationCandidate = Pick<
  InterestSignal,
  "category" | "type" | "city" | "title" | "desired" | "acceptsAnything"
> & {
  description?: string;
  ownerId?: string;
};

function matchingEntries(text: string, weights: Record<string, number>) {
  const haystack = normalized(text);
  return Object.entries(weights).filter(([term]) => haystack.includes(term));
}

export function scoreRecommendation(
  item: RecommendationCandidate,
  profile: InterestProfile,
) {
  const directMatches = matchingEntries(
    [item.title, item.category, item.description].filter(Boolean).join(" "),
    profile.desiredTerms,
  );
  const mutualMatches = matchingEntries(
    (item.desired ?? []).join(" "),
    profile.offeredTerms,
  );

  return (
    (profile.categories[normalized(item.category)] ?? 0) * 4 +
    (profile.types[normalized(item.type)] ?? 0) * 2 +
    (profile.cities[normalized(item.city)] ?? 0) +
    directMatches.reduce((sum, [, weight]) => sum + weight * 5, 0) +
    mutualMatches.reduce((sum, [, weight]) => sum + weight * 4, 0) +
    (item.acceptsAnything && Object.keys(profile.offeredTerms).length > 0 ? 3 : 0)
  );
}

export function getTopInterestLabels(profile: InterestProfile, limit = 3) {
  return Object.entries(profile.categories)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ru"))
    .slice(0, limit)
    .map(([label]) => label.charAt(0).toLocaleUpperCase("ru-RU") + label.slice(1));
}

export function getTopDesiredLabels(profile: InterestProfile, limit = 3) {
  const candidates = Object.entries(profile.desiredTerms)
    .filter(([term]) => term.includes(" ") || term.length >= 5)
    .sort(
      (left, right) =>
        right[1] - left[1] ||
        right[0].split(" ").length - left[0].split(" ").length ||
        right[0].length - left[0].length ||
        left[0].localeCompare(right[0], "ru"),
    );
  const selected: string[] = [];

  for (const [term] of candidates) {
    if (selected.some((label) => normalized(label).includes(term))) continue;
    selected.push(term.charAt(0).toLocaleUpperCase("ru-RU") + term.slice(1));
    if (selected.length >= limit) break;
  }

  return selected;
}

export function getRecommendationReasons(
  item: RecommendationCandidate,
  profile: InterestProfile,
  limit = 2,
) {
  const reasons: string[] = [];
  const directMatches = matchingEntries(
    [item.title, item.category, item.description].filter(Boolean).join(" "),
    profile.desiredTerms,
  ).sort((left, right) => right[1] - left[1] || right[0].length - left[0].length);
  const mutualMatches = matchingEntries(
    (item.desired ?? []).join(" "),
    profile.offeredTerms,
  );

  if (directMatches[0]) {
    const label = directMatches[0][0];
    reasons.push(`Похоже на то, что вы ищете: ${label}`);
  }
  if (
    mutualMatches.length > 0 ||
    (item.acceptsAnything && Object.keys(profile.offeredTerms).length > 0)
  ) {
    reasons.push("Владельцу может подойти ваш вариант");
  }
  if (
    reasons.length < limit &&
    (profile.categories[normalized(item.category)] ?? 0) > 0
  ) {
    reasons.push(`В ваших интересах: ${item.category}`);
  }
  if (
    reasons.length < limit &&
    (profile.cities[normalized(item.city)] ?? 0) > 0
  ) {
    reasons.push(`Подходит по городу: ${item.city}`);
  }

  return reasons.slice(0, limit);
}

export function getRelatedItemReason(
  item: Pick<RecommendationCandidate, "category" | "type" | "city">,
  source: Pick<RecommendationCandidate, "category" | "type" | "city">,
  personalReasons: string[] = [],
) {
  const mutualFit = personalReasons.find((reason) =>
    reason.startsWith("Владельцу может подойти"),
  );
  if (mutualFit) return mutualFit;

  const sameCategory = normalized(item.category) === normalized(source.category);
  const sameCity = normalized(item.city) === normalized(source.city);

  if (sameCategory && sameCity) return "Похожий вариант в том же городе";
  if (sameCategory) return `Ещё в категории «${item.category}»`;
  if (sameCity) return `Ещё один вариант в городе ${item.city}`;
  if (normalized(item.type) === normalized(source.type)) {
    return item.type === "SERVICE" ? "Ещё одна подходящая услуга" : "Ещё одна вещь для обмена";
  }

  return personalReasons[0] ?? "Свежий вариант для обмена";
}

export function selectDiverseRecommendations<T extends { ownerId: string; category: string }>(
  items: T[],
  limit: number,
) {
  const selected: T[] = [];
  const ownerCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const item of items) {
    if (selected.length >= limit) break;
    if ((ownerCounts.get(item.ownerId) ?? 0) >= 2) continue;
    if ((categoryCounts.get(item.category) ?? 0) >= 3) continue;
    selected.push(item);
    ownerCounts.set(item.ownerId, (ownerCounts.get(item.ownerId) ?? 0) + 1);
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  }

  if (selected.length < limit) {
    for (const item of items) {
      if (selected.length >= limit) break;
      if (!selected.includes(item)) selected.push(item);
    }
  }

  return selected;
}
