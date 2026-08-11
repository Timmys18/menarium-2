import type { ReactNode } from "react";
import { ArrowRight, CircleDashed } from "lucide-react";
import { SurfaceCard } from "@/components/menarium/card";
import { MenariumLinkButton } from "@/components/menarium/button";

export function EmptyState({
  icon = <CircleDashed className="h-7 w-7" />,
  title,
  description,
  actionHref,
  actionLabel,
  eyebrow,
  secondaryActionHref,
  secondaryActionLabel,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  eyebrow?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
}) {
  return (
    <SurfaceCard className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center sm:min-h-80 sm:p-12">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[21px] border border-teal-200/18 bg-teal-300/[0.08] text-teal-100">
        <span>{icon}</span>
      </div>
      {eyebrow ? (
        <p className="type-kicker mb-2 text-teal-200/90">{eyebrow}</p>
      ) : null}
      <h2 className="mb-2 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-white/78 sm:text-base">{description}</p>
      {actionHref && actionLabel ? (
        <div className="mt-6 flex w-full max-w-md flex-col justify-center gap-3 sm:flex-row">
          <MenariumLinkButton href={actionHref} className="w-full sm:w-auto">
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </MenariumLinkButton>
          {secondaryActionHref && secondaryActionLabel ? (
            <MenariumLinkButton href={secondaryActionHref} variant="secondary" className="w-full sm:w-auto">
              {secondaryActionLabel}
            </MenariumLinkButton>
          ) : null}
        </div>
      ) : null}
    </SurfaceCard>
  );
}
