"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";

export function ClearRecentViewsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function clearHistory() {
    if (pending) return;
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/items/views", { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Не удалось очистить историю");
      router.refresh();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Не удалось очистить историю");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="relative inline-flex w-full sm:w-auto">
      <button
        type="button"
        onClick={clearHistory}
        disabled={pending}
        aria-describedby={error ? "clear-recent-views-error" : undefined}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.035] px-3.5 text-xs font-semibold text-white/62 transition hover:border-rose-300/20 hover:bg-rose-300/[0.055] hover:text-rose-100/78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200/65 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {pending ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Очистить историю
      </button>
      {error ? (
        <span
          id="clear-recent-views-error"
          role="alert"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-rose-300/18 bg-[#151018] px-3 py-2 text-xs leading-5 text-rose-100/78 shadow-xl"
        >
          {error}
        </span>
      ) : null}
    </span>
  );
}
