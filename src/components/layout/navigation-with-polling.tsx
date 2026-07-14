"use client";

import { useCallback, useEffect, useState } from "react";
import { Navigation } from "@/components/layout/navigation";
import { useRealtime } from "@/components/hooks/use-realtime";

type InboxCounts = {
  unreadCount: number;
  pendingSwaps: number;
};

export function NavigationWithPolling({
  initialUnreadCount,
  initialPendingSwaps,
}: {
  initialUnreadCount: number;
  initialPendingSwaps: number;
}) {
  const [counts, setCounts] = useState<InboxCounts>({
    unreadCount: initialUnreadCount,
    pendingSwaps: initialPendingSwaps,
  });

  const refreshCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/inbox/counts", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json();
      if (!body?.data) return;
      setCounts({
        unreadCount: body.data.unreadCount ?? 0,
        pendingSwaps: body.data.pendingSwaps ?? 0,
      });
    } catch {
      // Keep the last known values while the connection recovers.
    }
  }, []);

  useRealtime(true, () => {
    void refreshCounts();
  });

  useEffect(() => {
    const onFocus = () => void refreshCounts();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCounts]);

  return <Navigation unreadCount={counts.unreadCount} pendingSwaps={counts.pendingSwaps} />;
}
