"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/layout/navigation";

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

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/inbox/counts", { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json();
        if (cancelled || !body?.data) return;
        setCounts({
          unreadCount: body.data.unreadCount ?? 0,
          pendingSwaps: body.data.pendingSwaps ?? 0,
        });
      } catch {
        // Тихо игнорируем сбои сети — остаются последние известные значения.
      }
    }

    const interval = window.setInterval(poll, 30_000);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return <Navigation unreadCount={counts.unreadCount} pendingSwaps={counts.pendingSwaps} />;
}
