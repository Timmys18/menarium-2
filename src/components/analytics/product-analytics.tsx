"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { normalizeAnalyticsPath } from "@/features/analytics/events";
import { trackClientProductEvent } from "@/lib/product-analytics-client";

export function ProductAnalytics() {
  const pathname = usePathname();
  const lastTrackedPathname = useRef<string | null>(null);

  useEffect(() => {
    const path = normalizeAnalyticsPath(pathname);
    if (lastTrackedPathname.current === pathname) return;
    lastTrackedPathname.current = pathname;

    void trackClientProductEvent({ name: "page_view", path });
  }, [pathname]);

  return null;
}
