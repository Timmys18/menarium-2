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
              <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                {nextAction.title}
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-white/64">{nextAction.description}</p>
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
    <GlassCard className="relative overflow-hidden p-5 sm:p-8">
      <div
        className={cn(
          "pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl",
          nextAction.kind === "urgent" ? "bg-amber-400/10" : "bg-teal-400/10",
        )}
      />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:gap-8">
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
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{nextAction.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/66 sm:mt-3 sm:text-base">{nextAction.description}</p>
          <MenariumLinkButton href={nextAction.href} className="mt-4 w-full sm:mt-6 sm:w-auto">
            {nextAction.label}
            <ArrowRight className="h-4 w-4" />
          </MenariumLinkButton>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-black/15 p-4 sm:rounded-3xl sm:p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/54">Путь до первого обмена</p>
              <p className="mt-2 text-2xl font-semibold">
                {activation.completedCount} <span className="text-base text-white/52">из {activation.steps.length}</span>
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
        <ol className="relative mt-6 grid grid-cols-5 gap-1.5 sm:mt-8 md:gap-3">
          {activation.steps.map((step, index) => {
            const Icon = stepIcons[step.id];
            const current = activation.nextStep?.id === step.id;
            return (
              <li
                key={step.id}
                className={cn(
                  "rounded-[13px] border p-2 transition-colors md:rounded-2xl md:p-4",
                  step.done && "border-teal-400/20 bg-teal-400/[0.06]",
                  current && "border-white/20 bg-white/[0.06]",
                  !step.done && !current && "border-white/[0.07] bg-white/[0.02]",
                )}
              >
                <div className="flex items-center justify-center gap-2 md:justify-between">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-[10px] md:h-9 md:w-9 md:rounded-xl",
                      step.done ? "bg-teal-400 text-[#071311]" : "bg-white/10 text-white/55",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {current ? (
                    <span className="hidden rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 md:inline-flex">
                      Сейчас
                    </span>
                  ) : (
                    <span className="hidden text-xs text-white/45 md:inline">{index + 1}</span>
                  )}
                </div>
                <p className={cn("mt-3 hidden text-sm font-medium md:block", step.done ? "text-white/62" : "text-white")}>{step.label}</p>
                <p className="mt-1 hidden text-xs leading-5 text-white/52 md:block">{step.description}</p>
                <span className="sr-only">{index + 1}. {step.label}. {step.description}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </GlassCard>
  );
}
