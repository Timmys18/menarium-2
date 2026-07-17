import { ArrowRight, Check, CircleUserRound, MailCheck, Repeat2, Sparkles, Tag } from "lucide-react";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import type { ActivationStepId, ProfileActivation } from "@/features/profile/activation";
import { cn } from "@/lib/utils";

const stepIcons = {
  verify: MailCheck,
  profile: CircleUserRound,
  listing: Tag,
  proposal: Repeat2,
  completed: Check,
} satisfies Record<ActivationStepId, typeof MailCheck>;

export function ActivationPanel({ activation }: { activation: ProfileActivation }) {
  const { nextAction } = activation;
  const compact = activation.complete || activation.completedCount >= 4;

  if (compact) {
    return (
      <GlassCard className="relative overflow-hidden border border-white/8 p-5 sm:p-6">
        <div
          className={cn(
            "pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full blur-3xl",
            nextAction.kind === "urgent" ? "bg-amber-400/10" : "bg-teal-400/10",
          )}
        />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]",
                nextAction.kind === "urgent"
                  ? "bg-amber-300/12 text-amber-200"
                  : "bg-teal-300/10 text-teal-200",
              )}
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-[0.16em]",
                  nextAction.kind === "urgent" ? "text-amber-200/75" : "text-teal-200/70",
                )}
              >
                {nextAction.eyebrow}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {nextAction.title}
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-white/48">{nextAction.description}</p>
            </div>
          </div>
          <MenariumLinkButton href={nextAction.href} className="shrink-0">
            {nextAction.label}
            <ArrowRight className="h-4 w-4" />
          </MenariumLinkButton>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="relative overflow-hidden p-6 sm:p-8">
      <div
        className={cn(
          "pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl",
          nextAction.kind === "urgent" ? "bg-amber-400/10" : "bg-teal-400/10",
        )}
      />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div>
          <div
            className={cn(
              "mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]",
              nextAction.kind === "urgent" ? "text-amber-200" : "text-teal-300",
            )}
          >
            <Sparkles className="h-4 w-4" />
            {nextAction.eyebrow}
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{nextAction.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">{nextAction.description}</p>
          <MenariumLinkButton href={nextAction.href} className="mt-6 w-full sm:w-auto">
            {nextAction.label}
            <ArrowRight className="h-4 w-4" />
          </MenariumLinkButton>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/35">Путь до первого обмена</p>
              <p className="mt-2 font-display text-2xl font-semibold">
                {activation.completedCount} <span className="text-base text-white/35">из {activation.steps.length}</span>
              </p>
            </div>
            <span className="text-sm font-semibold text-teal-200">{activation.progress}%</span>
          </div>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Прогресс до первого обмена"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={activation.progress}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 transition-[width] duration-500"
              style={{ width: `${activation.progress}%` }}
            />
          </div>
        </div>
      </div>

      {!activation.complete ? (
        <ol className="relative mt-8 grid gap-3 md:grid-cols-5">
          {activation.steps.map((step, index) => {
            const Icon = stepIcons[step.id];
            const current = activation.nextStep?.id === step.id;
            return (
              <li
                key={step.id}
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  step.done && "border-teal-400/20 bg-teal-400/[0.06]",
                  current && "border-white/20 bg-white/[0.06]",
                  !step.done && !current && "border-white/[0.07] bg-white/[0.02]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      step.done ? "bg-teal-400 text-[#071311]" : "bg-white/10 text-white/55",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {current ? (
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/60">
                      Сейчас
                    </span>
                  ) : (
                    <span className="text-xs text-white/25">{index + 1}</span>
                  )}
                </div>
                <p className={cn("mt-3 text-sm font-medium", step.done ? "text-white/50" : "text-white")}>{step.label}</p>
                <p className="mt-1 text-xs leading-5 text-white/35">{step.description}</p>
              </li>
            );
          })}
        </ol>
      ) : null}
    </GlassCard>
  );
}
