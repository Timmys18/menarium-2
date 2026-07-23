"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, Flag, Loader2, ShieldCheck } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";
import { ConfirmDialog, MenariumDialog } from "@/components/menarium/dialog";
import { MenariumTextarea } from "@/components/menarium/input";

const reasons = [
  { value: "FRAUD", label: "Подозрение на мошенничество" },
  { value: "SPAM", label: "Спам или навязчивая реклама" },
  { value: "HARASSMENT", label: "Оскорбления или преследование" },
  { value: "PROHIBITED_CONTENT", label: "Запрещённый контент" },
  { value: "OTHER", label: "Другая причина" },
] as const;

const exchangeReasons = [
  { value: "FRAUD", label: "Вещь или условия не соответствуют договорённости" },
  { value: "HARASSMENT", label: "Небезопасное поведение или давление" },
  { value: "OTHER", label: "Неявка или другая проблема с договорённостью" },
] as const;

export function TrustActions({
  targetType,
  targetId,
  userId,
  initialBlocked = false,
  swapId,
}: {
  targetType: "USER" | "ITEM";
  targetId: string;
  userId?: string;
  initialBlocked?: boolean;
  swapId?: string;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number]["value"]>("FRAUD");
  const [details, setDetails] = useState("");
  const [blocked, setBlocked] = useState(initialBlocked);
  const [pending, setPending] = useState<"report" | "block" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reportReasons = swapId ? exchangeReasons : reasons;

  async function submitReport() {
    setPending("report");
    setError(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, details, swapId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось отправить жалобу");
      setReportOpen(false);
      setDetails("");
      setMessage(body.meta?.message ?? "Жалоба передана модератору.");
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Не удалось отправить жалобу");
    } finally {
      setPending(null);
    }
  }

  async function toggleBlock() {
    if (!userId) return;
    setPending("block");
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}/block`, {
        method: blocked ? "DELETE" : "PUT",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось изменить блокировку");
      setBlocked(!blocked);
      setBlockOpen(false);
      setMessage(blocked ? "Пользователь разблокирован." : "Пользователь заблокирован.");
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : "Не удалось изменить блокировку");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <MenariumButton size="sm" variant="ghost" onClick={() => setReportOpen(true)}>
          <Flag className="h-4 w-4" />
          Пожаловаться
        </MenariumButton>
        {userId ? (
          <MenariumButton
            size="sm"
            variant={blocked ? "secondary" : "ghost"}
            onClick={() => setBlockOpen(true)}
          >
            {blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            {blocked ? "Разблокировать" : "Заблокировать"}
          </MenariumButton>
        ) : null}
      </div>
      {message ? (
        <p className="text-sm text-teal-200">
          {message}{" "}
          <Link href="/profile/safety" className="font-semibold underline underline-offset-4">
            Открыть обращения
          </Link>
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <MenariumDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Сообщить модератору"
        description={
          swapId
            ? "Мы прикрепим к обращению этот обмен, чтобы модератор видел договорённость и мог разобраться быстрее."
            : "Жалоба конфиденциальна. Мы проверим её и примем меры, если правила нарушены."
        }
        footer={
          <>
            <MenariumButton variant="secondary" onClick={() => setReportOpen(false)} disabled={pending === "report"}>
              Отмена
            </MenariumButton>
            <MenariumButton onClick={() => void submitReport()} disabled={pending === "report"}>
              {pending === "report" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              Отправить
            </MenariumButton>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm text-white/70">
            Причина
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as typeof reason)}
              className="glass-card mt-2 w-full rounded-2xl px-4 py-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
            >
              {reportReasons.map((entry) => (
                <option key={entry.value} value={entry.value} className="bg-[#11111a]">
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <MenariumTextarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={1000}
            placeholder="Опишите ситуацию — это поможет модератору разобраться."
          />
          <p className="text-right text-xs text-white/35">{details.length}/1000</p>
        </div>
      </MenariumDialog>

      <ConfirmDialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        onConfirm={() => void toggleBlock()}
        title={blocked ? "Разблокировать пользователя?" : "Заблокировать пользователя?"}
        description={
          blocked
            ? "После разблокировки пользователь снова сможет открывать новые чаты и предлагать обмены."
            : "Ожидающие предложения отменятся, а новые чаты по объявлениям и обмены будут недоступны. Чат уже принятой сделки останется открыт, чтобы вы могли безопасно её завершить."
        }
        confirmLabel={blocked ? "Разблокировать" : "Заблокировать"}
        pending={pending === "block"}
        danger={!blocked}
      />
    </div>
  );
}
