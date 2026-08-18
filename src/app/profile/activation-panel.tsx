import type { ComponentType } from "react";
import { ArrowRight, Check, CircleUserRound, MailCheck, Tag } from "lucide-react";
import { BrandGlyph } from "@/components/menarium/brand";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import type { ActivationStepId, ProfileActivation } from "@/features/profile/activation";
import { cn } from "@/lib/utils";

const stepIcons: Record<ActivationStepId, ComponentType<{ className?: string }>> = {
  verify: MailCheck,
  profile: CircleUserRound,
  listing: Tag,
  proposal: BrandGlyph,
  completed: Check,
};

export function ActivationPanel({ activation }: { activation: ProfileActivation }) {
  const { nextAction } = activation;

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
            <BrandGlyph className="h-6 w-6" />
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
            <p className="mt-1.5 max-w-2xl text-sm leading-5 text-white/64">
              {nextAction.description}
            </p>
          </div>
        </div>
        <MenariumLinkButton href={nextAction.href} className="w-full shrink-0 sm:w-auto">
            {nextAction.label}
            <ArrowRight className="h-4 w-4" />
        </MenariumLinkButton>
      </div>

      {!activation.complete ? (
        <div className="relative mt-5 border-t border-white/[0.07] pt-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-xs font-medium text-white/62">Путь до первого обмена</p>
            <p className="text-xs font-semibold text-teal-200/78">
              {activation.completedCount} из {activation.steps.length}
            </p>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
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
          <ol className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-3">
            {activation.steps.map((step) => {
              const Icon = stepIcons[step.id];
              const current = activation.nextStep?.id === step.id;
              return (
                <li key={step.id} className="min-w-0">
                  <span
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-[10px] border transition-colors sm:mx-0",
                      step.done ? "bg-teal-400 text-[#071311]" : "bg-white/10 text-white/62",
                      step.done && "border-teal-300/40",
                      current && "border-white/30 bg-white/[0.12] text-white",
                      !step.done && !current && "border-white/[0.06]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p
                    className={cn(
                      "mt-2 hidden truncate text-micro sm:block",
                      current ? "font-semibold text-white/78" : "text-white/62",
                    )}
                    title={step.label}
                  >
                    {step.label}
                  </p>
                  <span className="sr-only">
                    {step.label}. {step.description}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </GlassCard>
  );
}
