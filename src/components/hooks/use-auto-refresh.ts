"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Периодически обновляет серверные данные страницы (polling через router.refresh). */
export function useAutoRefresh(enabled: boolean, intervalMs = 8000) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => router.refresh(), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs, router]);
}
