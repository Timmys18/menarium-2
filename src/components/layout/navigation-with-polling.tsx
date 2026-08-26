"use client";

import { useCallback, useEffect, useState } from "react";
import { Navigation } from "@/components/layout/navigation";
import { useRealtime } from "@/components/hooks/use-realtime";

type InboxCounts = {
  unreadNotifications: number;
  unreadMessages: number;
  pendingSwaps: number;
};

export function NavigationWithPolling({
  enabled,
  initialUnreadNotifications,
  initialUnreadMessages,
  initialPendingSwaps,
}: {
  enabled: boolean;
  initialUnreadNotifications: number;
  initialUnreadMessages: number;
  initialPendingSwaps: number;
}) {
  const [counts, setCounts] = useState<InboxCounts>({
    unreadNotifications: initialUnreadNotifications,
    unreadMessages: initialUnreadMessages,
    pendingSwaps: initialPendingSwaps,
  });

  const refreshCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/inbox/counts", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json();
      if (!body?.data) return;
      setCounts({
        unreadNotifications: body.data.unreadNotifications ?? 0,
        unreadMessages: body.data.unreadMessages ?? 0,
        pendingSwaps: body.data.pendingSwaps ?? 0,
      });
    } catch {
      // Keep the last known values while the connection recovers.
    }
  }, []);

  useRealtime(enabled, () => {
    void refreshCounts();
  });

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => void refreshCounts();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, refreshCounts]);

  return (
    <Navigation
      unreadNotifications={counts.unreadNotifications}
      unreadMessages={counts.unreadMessages}
      pendingSwaps={counts.pendingSwaps}
    />
  );
}
