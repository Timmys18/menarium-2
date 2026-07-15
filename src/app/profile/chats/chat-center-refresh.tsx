"use client";

import { useAutoRefresh } from "@/components/hooks/use-auto-refresh";

export function ChatCenterRefresh() {
  useAutoRefresh(true, (event) => {
    return event.type === "deal-message" || event.type === "item-message";
  });

  return null;
}
