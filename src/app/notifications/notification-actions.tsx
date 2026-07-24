"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";

async function readError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : "Не удалось обновить уведомления";
}

export function MarkNotificationRead({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markRead() {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(await readError(response));
      router.refresh();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Не удалось отметить уведомление");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={markRead}
        disabled={isPending}
        aria-label="Отметить уведомление прочитанным"
        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs text-teal-200 transition-colors hover:bg-teal-300/[0.08] hover:text-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        <span className="sr-only sm:not-sr-only">{isPending ? "Сохраняем…" : "Прочитать"}</span>
      </button>
      {error ? <span role="alert" className="max-w-40 text-right text-[10px] leading-4 text-red-200">{error}</span> : null}
    </div>
  );
}

export function MarkAllNotificationsRead({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markAllRead() {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true }),
      });
      if (!response.ok) throw new Error(await readError(response));
      router.refresh();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Не удалось обновить уведомления");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full md:w-auto">
      <MenariumButton className="w-full md:w-auto" variant="secondary" size="sm" onClick={markAllRead} disabled={disabled || isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
        Прочитать все
      </MenariumButton>
      {error ? <p role="alert" className="mt-2 max-w-56 text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
