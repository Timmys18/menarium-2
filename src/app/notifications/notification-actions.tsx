"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";

async function readError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : "Не удалось обновить уведомления";
}

export function MarkNotificationRead({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function markRead() {
    setIsPending(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(await readError(response));
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={markRead}
      disabled={isPending}
      className="text-xs text-teal-300 transition-colors hover:text-teal-200 disabled:opacity-50"
    >
      {isPending ? "..." : "Прочитано"}
    </button>
  );
}

export function MarkAllNotificationsRead({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function markAllRead() {
    setIsPending(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true }),
      });
      if (!response.ok) throw new Error(await readError(response));
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <MenariumButton variant="secondary" size="sm" onClick={markAllRead} disabled={disabled || isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
      Прочитать все
    </MenariumButton>
  );
}
