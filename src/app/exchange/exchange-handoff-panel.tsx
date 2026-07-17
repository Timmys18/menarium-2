"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MapPin,
  Pencil,
  Truck,
  Video,
} from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";
import { MenariumTextarea } from "@/components/menarium/input";
import { handoffModeLabels } from "@/features/exchange/handoff";
import { cn } from "@/lib/utils";

type HandoffMode = keyof typeof handoffModeLabels;
type HandoffPlanView = {
  handoffMode: HandoffMode | null;
  handoffScheduledAt: string | null;
  handoffDetails: string | null;
  handoffRevision: number;
  senderHandoffConfirmed: boolean;
  receiverHandoffConfirmed: boolean;
};

const modeOptions = [
  { value: "IN_PERSON" as const, icon: MapPin, hint: "Встретиться лично" },
  { value: "DELIVERY" as const, icon: Truck, hint: "Передать доставкой" },
  { value: "ONLINE" as const, icon: Video, hint: "Услуга или цифровой результат" },
];

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function planPlaceholder(mode: HandoffMode) {
  if (mode === "IN_PERSON") return "Точное место встречи и ориентир";
  if (mode === "DELIVERY") return "Служба доставки, кто оплачивает и куда передать";
  return "Ссылка, формат созвона или способ передачи результата";
}

export function ExchangeHandoffPanel({
  swapId,
  initialPlan,
  isSender,
  partnerName,
  readOnly = false,
}: {
  swapId: string;
  initialPlan: HandoffPlanView;
  isSender: boolean;
  partnerName: string;
  readOnly?: boolean;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [editing, setEditing] = useState(!initialPlan.handoffMode && !readOnly);
  const [mode, setMode] = useState<HandoffMode>(initialPlan.handoffMode ?? "IN_PERSON");
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocal(initialPlan.handoffScheduledAt));
  const [details, setDetails] = useState(initialPlan.handoffDetails ?? "");
  const [pending, setPending] = useState<"save" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const yourConfirmed = isSender
    ? plan.senderHandoffConfirmed
    : plan.receiverHandoffConfirmed;
  const partnerConfirmed = isSender
    ? plan.receiverHandoffConfirmed
    : plan.senderHandoffConfirmed;
  const bothConfirmed = yourConfirmed && partnerConfirmed;

  async function runAction(payload: Record<string, unknown>, action: "save" | "confirm") {
    setError(null);
    setPending(action);
    try {
      const response = await fetch(`/api/exchange/${swapId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: HandoffPlanView;
        error?: string;
      };
      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Не удалось сохранить договорённость");
      }
      setPlan(body.data);
      setMode(body.data.handoffMode ?? mode);
      setScheduledAt(toDateTimeLocal(body.data.handoffScheduledAt));
      setDetails(body.data.handoffDetails ?? "");
      setEditing(false);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Не удалось сохранить договорённость");
    } finally {
      setPending(null);
    }
  }

  async function savePlan() {
    if (!scheduledAt || details.trim().length < 3) {
      setError("Укажите дату и понятные детали передачи");
      return;
    }
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) {
      setError("Проверьте дату и время");
      return;
    }
    await runAction(
      {
        action: "save",
        mode,
        scheduledAt: date.toISOString(),
        details,
        revision: plan.handoffRevision,
      },
      "save",
    );
  }

  return (
    <section className="mb-5 rounded-[18px] border border-blue-300/14 bg-blue-400/[0.04] p-4" aria-labelledby="handoff-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-blue-300/10 text-blue-100">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="handoff-title" className="text-sm font-semibold text-white/90">
              Передача и встреча
            </h3>
            {bothConfirmed ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Подтверждено обоими
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-white/38">
            Договорённость видят только участники этого обмена.
          </p>
        </div>
      </div>

      {plan.handoffMode ? (
        <div className="mt-4 rounded-[16px] border border-white/8 bg-white/[0.025] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white/80">{handoffModeLabels[plan.handoffMode]}</p>
            {plan.handoffScheduledAt ? (
              <time dateTime={plan.handoffScheduledAt} className="text-xs text-blue-100/62">
                {new Intl.DateTimeFormat("ru-RU", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(plan.handoffScheduledAt))}
              </time>
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/58">{plan.handoffDetails}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/7 pt-3 text-xs">
            <span className={yourConfirmed ? "text-teal-200" : "text-amber-100/60"}>
              {yourConfirmed ? "Вы подтвердили" : "Нужно ваше подтверждение"}
            </span>
            <span className={cn("text-right", partnerConfirmed ? "text-teal-200" : "text-white/34")}>
              {partnerConfirmed ? `${partnerName} подтвердил(а)` : `Ждём ${partnerName}`}
            </span>
          </div>
        </div>
      ) : readOnly ? (
        <p className="mt-4 rounded-[15px] border border-white/7 bg-white/[0.025] px-4 py-3 text-sm text-white/42">
          Детали передачи не были зафиксированы в Menarium.
        </p>
      ) : null}

      {editing ? (
        <div className="mt-4 space-y-4 border-t border-white/7 pt-4">
          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Способ передачи">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const selected = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-[14px] border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65",
                    selected
                      ? "border-blue-300/28 bg-blue-300/[0.085]"
                      : "border-white/8 bg-white/[0.025] hover:bg-white/[0.05]",
                  )}
                >
                  <Icon className={cn("h-4 w-4", selected ? "text-teal-200" : "text-white/34")} />
                  <span className="mt-2 block text-xs font-semibold text-white/76">{handoffModeLabels[option.value]}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-white/32">{option.hint}</span>
                </button>
              );
            })}
          </div>

          <label className="block text-xs font-medium text-white/52">
            Дата и время
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-[13px] border border-white/10 bg-[#0d131d] px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-300/55 focus-visible:ring-2 focus-visible:ring-blue-300/50"
            />
          </label>
          <label htmlFor="handoff-details" className="block text-xs font-medium text-white/52">
            Детали
          </label>
          <MenariumTextarea
            id="handoff-details"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={500}
            placeholder={planPlaceholder(mode)}
            className="min-h-24"
          />
          <div className="flex items-start gap-2 text-xs leading-5 text-white/34">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Не указывайте данные банковских карт и коды подтверждения. Изменение сбросит подтверждение партнёра.
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {plan.handoffMode ? (
              <MenariumButton type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={Boolean(pending)}>
                Отмена
              </MenariumButton>
            ) : null}
            <MenariumButton type="button" size="sm" onClick={() => void savePlan()} disabled={Boolean(pending)}>
              {pending === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Сохранить и подтвердить
            </MenariumButton>
          </div>
        </div>
      ) : !readOnly ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {!yourConfirmed && plan.handoffMode ? (
            <MenariumButton
              type="button"
              size="sm"
              className="flex-1"
              onClick={() => void runAction({ action: "confirm", revision: plan.handoffRevision }, "confirm")}
              disabled={Boolean(pending)}
            >
              {pending === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Подтвердить договорённость
            </MenariumButton>
          ) : null}
          <MenariumButton type="button" variant="ghost" size="sm" className="flex-1" onClick={() => setEditing(true)} disabled={Boolean(pending)}>
            <Pencil className="h-4 w-4" />
            Изменить план
          </MenariumButton>
        </div>
      ) : null}

      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
