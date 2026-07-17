const INTERNAL_ORIGIN = "https://menarium.internal";

export function getSafeNotificationHref(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;

  try {
    const url = new URL(value, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) return null;
    const legacyThreadId = url.searchParams.get("thread");
    if (
      /^\/item\/[A-Za-z0-9_-]+$/.test(url.pathname) &&
      legacyThreadId &&
      /^[A-Za-z0-9_-]{1,128}$/.test(legacyThreadId)
    ) {
      return `/profile/chats/item/${legacyThreadId}`;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
