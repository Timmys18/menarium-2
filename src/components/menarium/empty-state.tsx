import type { ReactNode } from "react";
import { ArrowRight, CircleDashed } from "lucide-react";
import { GlassCard } from "@/components/menarium/card";
import { MenariumLinkButton } from "@/components/menarium/button";

export function EmptyState({
  icon = <CircleDashed className="h-7 w-7" />,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <GlassCard className="relative flex min-h-72 flex-col items-center justify-center overflow-hidden px-6 py-10 text-center sm:min-h-80 sm:p-12">
      <div aria-hidden="true" className="absolute -top-24 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-28 right-[12%] h-52 w-52 rounded-full bg-teal-300/[0.08] blur-3xl" />
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-[21px] border border-teal-200/18 bg-gradient-to-br from-blue-400/14 to-teal-300/10 text-teal-100 shadow-[0_18px_50px_rgba(56,214,178,0.12)]">
        <span aria-hidden="true" className="absolute -inset-2 rounded-[27px] border border-white/[0.045]" />
        <span className="relative">{icon}</span>
      </div>
      <p className="relative mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200/68">
        Следующий шаг
      </p>
      <h2 className="relative mb-2 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <p className="relative max-w-md text-sm leading-6 text-white/66 sm:text-base">{description}</p>
      {actionHref && actionLabel ? (
        <MenariumLinkButton href={actionHref} className="relative mt-6">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </MenariumLinkButton>
      ) : null}
    </GlassCard>
  );
}
