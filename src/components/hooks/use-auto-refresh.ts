"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealtime } from "@/components/hooks/use-realtime";

/** Refreshes server-rendered data when Redis pub/sub delivers a user event. */
export function useAutoRefresh(enabled: boolean) {
  const router = useRouter();
  const connected = useRealtime(enabled, () => router.refresh());

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, router]);

  return connected;
}
