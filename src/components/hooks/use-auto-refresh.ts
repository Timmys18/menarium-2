"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealtime, type RealtimeEvent } from "@/components/hooks/use-realtime";

const REFRESH_AFTER_AWAY_MS = 1_000;

/** Refreshes server-rendered data when Redis pub/sub delivers a user event. */
export function useAutoRefresh(
  enabled: boolean,
  shouldRefresh?: (event: RealtimeEvent) => boolean,
) {
  const router = useRouter();
  const connected = useRealtime(enabled, (event) => {
    if (!shouldRefresh || shouldRefresh(event)) router.refresh();
  });

  useEffect(() => {
    if (!enabled) return;

    let awayAt: number | null = null;
    const markAway = () => {
      awayAt ??= Date.now();
    };
    const refreshAfterReturn = () => {
      if (awayAt !== null && Date.now() - awayAt >= REFRESH_AFTER_AWAY_MS) {
        router.refresh();
      }
      awayAt = null;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") markAway();
      else refreshAfterReturn();
    };

    window.addEventListener("blur", markAway);
    window.addEventListener("focus", refreshAfterReturn);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", markAway);
      window.removeEventListener("focus", refreshAfterReturn);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, router]);

  return connected;
}
