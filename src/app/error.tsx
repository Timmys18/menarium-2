"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { BrandLockup } from "@/components/menarium/brand";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

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
    <div className="min-h-screen px-4 pb-16 pt-4 sm:px-6">
      <header className="app-chrome mx-auto flex max-w-5xl items-center rounded-[24px] px-4 py-3">
        <Link
          href="/"
          aria-label="Менариум — главная"
          className="inline-flex min-h-11 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
        >
          <BrandLockup markClassName="h-9 w-9" textClassName="text-lg" />
        </Link>
      </header>
      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-5xl items-center justify-center py-10">
      <div className="glass-card w-full max-w-xl rounded-3xl p-6 text-center sm:p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold">Что-то пошло не так</h1>
        <p className="mt-3 text-white/62">Не удалось загрузить страницу. Попробуйте ещё раз или вернитесь на главную.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <MenariumButton onClick={reset}>
            <RotateCcw className="h-5 w-5" />
            Повторить
          </MenariumButton>
          <MenariumLinkButton href="/" variant="secondary">
            На главную
          </MenariumLinkButton>
        </div>
        <a href={SUPPORT_MAILTO} className="mt-5 inline-flex min-h-11 items-center rounded-xl px-2 text-sm text-teal-200 transition hover:bg-white/[0.05] hover:text-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70">
          Сообщить об ошибке: {SUPPORT_EMAIL}
        </a>
      </div>
      </div>
    </div>
  );
}
