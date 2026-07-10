"use client";

import { useAutoRefresh } from "@/components/hooks/use-auto-refresh";

export function ExchangeChatRefresh({ enabled }: { enabled: boolean }) {
  useAutoRefresh(enabled, 8000);
  return (
    <p className="mt-6 flex items-center gap-2 text-sm text-white/45">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-teal-400/80" />
      Обновление каждые 8 секунд
    </p>
  );
}
