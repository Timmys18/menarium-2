export const REVIEW_BLIND_PERIOD_DAYS = 14;

export function getInitialReviewVisibleAt(completedAt: Date) {
  const visibleAt = new Date(completedAt);
  visibleAt.setUTCDate(visibleAt.getUTCDate() + REVIEW_BLIND_PERIOD_DAYS);
  return visibleAt;
}

export function isReviewVisible(visibleAt: Date, now = new Date()) {
  return visibleAt.getTime() <= now.getTime();
}
