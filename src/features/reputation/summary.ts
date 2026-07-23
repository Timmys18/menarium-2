export type RatingCount = {
  rating: number;
  count: number;
};

export type ReputationSummary = {
  averageRating: number | null;
  reviewCount: number;
  positivePercentage: number | null;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  label: string;
  description: string;
};

export function buildReputationSummary(
  completedSwaps: number,
  groups: RatingCount[],
): ReputationSummary {
  const distribution: ReputationSummary["distribution"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const group of groups) {
    if (group.rating >= 1 && group.rating <= 5) {
      distribution[group.rating as keyof typeof distribution] = Math.max(0, group.count);
    }
  }

  const reviewCount = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  const ratingSum = Object.entries(distribution).reduce(
    (sum, [rating, count]) => sum + Number(rating) * count,
    0,
  );
  const averageRating = reviewCount > 0 ? ratingSum / reviewCount : null;
  const positivePercentage =
    reviewCount > 0
      ? Math.round(((distribution[4] + distribution[5]) / reviewCount) * 100)
      : null;

  if (reviewCount === 0) {
    return {
      averageRating,
      reviewCount,
      positivePercentage,
      distribution,
      label: completedSwaps > 0 ? "Первые отзывы впереди" : "Новая репутация",
      description:
        completedSwaps > 0
          ? "Обмены уже завершались, но публичных отзывов пока нет."
          : "История появится после первых подтверждённых обменов.",
    };
  }

  if (reviewCount < 3) {
    return {
      averageRating,
      reviewCount,
      positivePercentage,
      distribution,
      label: "Репутация формируется",
      description: "Оценка основана пока на небольшом числе подтверждённых отзывов.",
    };
  }

  if (averageRating! >= 4.7 && reviewCount >= 5) {
    return {
      averageRating,
      reviewCount,
      positivePercentage,
      distribution,
      label: "Отличная репутация",
      description: "Большинство партнёров высоко оценили завершённые обмены.",
    };
  }

  if (averageRating! >= 4.2) {
    return {
      averageRating,
      reviewCount,
      positivePercentage,
      distribution,
      label: "Хорошая репутация",
      description: "Отзывы после завершённых обменов в основном положительные.",
    };
  }

  return {
    averageRating,
    reviewCount,
    positivePercentage,
    distribution,
    label: "Изучите отзывы",
    description: "В истории есть разный опыт — посмотрите детали перед обменом.",
  };
}
