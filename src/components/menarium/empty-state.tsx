import type { ReactNode } from "react";
import { GlassCard } from "@/components/menarium/card";
import { MenariumLinkButton } from "@/components/menarium/button";

export function EmptyState({
  icon = "∅",
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
    <GlassCard className="flex flex-col items-center justify-center p-10 text-center">
      <div className="mb-4 text-5xl text-white/30">{icon}</div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="max-w-md text-white/55">{description}</p>
      {actionHref && actionLabel ? (
        <MenariumLinkButton href={actionHref} className="mt-6" variant="secondary">
          {actionLabel}
        </MenariumLinkButton>
      ) : null}
    </GlassCard>
  );
}
