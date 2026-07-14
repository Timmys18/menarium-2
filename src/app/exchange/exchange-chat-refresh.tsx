"use client";

import { useAutoRefresh } from "@/components/hooks/use-auto-refresh";

export function ExchangeChatRefresh({ enabled }: { enabled: boolean }) {
  const connected = useAutoRefresh(enabled);
  return (
    <p className="mt-6 flex items-center gap-2 text-sm text-white/45">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          connected ? "animate-pulse bg-teal-400/80" : "bg-amber-400/70"
        }`}
      />
      {connected ? "Сообщения обновляются мгновенно" : "Восстанавливаем live-соединение…"}
    </p>
  );
}
