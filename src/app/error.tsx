"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-card max-w-xl rounded-3xl p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold">Что-то пошло не так</h1>
        <p className="mt-3 text-white/62">
          Не удалось загрузить страницу. Попробуйте обновить — если ошибка повторится, напишите в поддержку.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <MenariumButton onClick={reset}>
            <RotateCcw className="h-5 w-5" />
            Повторить
          </MenariumButton>
          <MenariumLinkButton href="/" variant="secondary">
            На главную
          </MenariumLinkButton>
        </div>
      </div>
    </div>
  );
}
