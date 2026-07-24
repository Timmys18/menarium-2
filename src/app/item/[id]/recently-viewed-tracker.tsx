"use client";

import { useEffect } from "react";

export function RecentlyViewedTracker({ itemId }: { itemId: string }) {
  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/items/${itemId}/view`, {
      method: "POST",
      keepalive: true,
      signal: controller.signal,
    }).catch(() => undefined);

    return () => controller.abort();
  }, [itemId]);

  return null;
}
