"use client";

import { CheckCircle2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function ProfileNotice({ kind }: { kind: "welcome" | "verified" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const title = kind === "verified" ? "Адрес почты подтверждён" : "Аккаунт создан";
  const description =
    kind === "verified"
      ? "Адрес подтверждён. Уведомления об обменах будут приходить на эту почту."
      : "Профиль создан. Теперь можно добавить вещь или услугу.";

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-teal-400/25 bg-teal-400/[0.08] p-4 sm:p-5"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-white/62">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          const nextParams = new URLSearchParams(searchParams.toString());
          nextParams.delete(kind);
          const query = nextParams.toString();
          router.replace(query ? `/profile?${query}` : "/profile", { scroll: false });
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/78 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/75"
        aria-label="Закрыть сообщение"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
