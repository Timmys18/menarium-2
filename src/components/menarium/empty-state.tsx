import type { ReactNode } from "react";
import { CircleDashed } from "lucide-react";
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
    <GlassCard className="flex flex-col items-center justify-center px-6 py-10 text-center sm:p-12">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-teal-200 shadow-inner shadow-white/[0.025]">
        {icon}
      </div>
      <h2 className="mb-2 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-white/52 sm:text-base">{description}</p>
      {actionHref && actionLabel ? (
        <MenariumLinkButton href={actionHref} className="mt-6" variant="secondary">
          {actionLabel}
        </MenariumLinkButton>
      ) : null}
    </GlassCard>
  );
}
