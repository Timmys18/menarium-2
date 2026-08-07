"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Loader2, XCircle } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";
import { MenariumDialog } from "@/components/menarium/dialog";
import { MenariumTextarea } from "@/components/menarium/input";

type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
type NextStatus = Exclude<ReportStatus, "OPEN">;

const actionCopy: Record<
  NextStatus,
  { label: string; title: string; description: string; variant: "secondary" | "primary" | "danger" }
> = {
  REVIEWING: {
    label: "В работу",
    title: "Взять жалобу в работу?",
    description: "Статус покажет другим модераторам, что проверка уже началась.",
    variant: "secondary",
  },
  RESOLVED: {
    label: "Нарушение подтверждено",
    title: "Завершить проверку?",
    description: "Жалоба будет отмечена как подтверждённая и закрыта.",
    variant: "primary",
  },
  DISMISSED: {
    label: "Отклонить",
    title: "Отклонить жалобу?",
    description: "Жалоба будет закрыта без подтверждения нарушения.",
    variant: "danger",
  },
};

export function ReportModerationActions({
  reportId,
  status,
  initialResolutionNote,
}: {
  reportId: string;
  status: ReportStatus;
  initialResolutionNote: string | null;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<NextStatus | null>(null);
  const [resolutionNote, setResolutionNote] = useState(initialResolutionNote ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog(targetStatus: NextStatus) {
    setError(null);
    setResolutionNote(initialResolutionNote ?? "");
    setNextStatus(targetStatus);
  }

  function closeDialog() {
    if (!pending) setNextStatus(null);
  }

  async function updateStatus() {
    if (!nextStatus) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, resolutionNote }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось обновить жалобу");

      setNextStatus(null);
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Не удалось обновить жалобу");
    } finally {
      setPending(false);
    }
  }

  const dialogCopy = nextStatus ? actionCopy[nextStatus] : null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status !== "REVIEWING" ? (
          <MenariumButton size="sm" variant="secondary" onClick={() => openDialog("REVIEWING")}>
            <Eye className="h-4 w-4" />
            В работу
          </MenariumButton>
        ) : null}
        {status !== "RESOLVED" ? (
          <MenariumButton size="sm" onClick={() => openDialog("RESOLVED")}>
            <CheckCircle2 className="h-4 w-4" />
            Подтвердить
          </MenariumButton>
        ) : null}
        {status !== "DISMISSED" ? (
          <MenariumButton size="sm" variant="danger" onClick={() => openDialog("DISMISSED")}>
            <XCircle className="h-4 w-4" />
            Отклонить
          </MenariumButton>
        ) : null}
      </div>

      <MenariumDialog
        open={nextStatus !== null}
        onClose={closeDialog}
        title={dialogCopy?.title ?? "Обновить жалобу"}
        description={dialogCopy?.description}
        danger={nextStatus === "DISMISSED"}
        footer={
          <>
            <MenariumButton variant="secondary" onClick={closeDialog} disabled={pending}>
              Отмена
            </MenariumButton>
            <MenariumButton
              variant={dialogCopy?.variant ?? "primary"}
              onClick={() => void updateStatus()}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {dialogCopy?.label ?? "Сохранить"}
            </MenariumButton>
          </>
        }
      >
        <label className="block text-sm text-white/70">
          Комментарий модератора
          <MenariumTextarea
            value={resolutionNote}
            onChange={(event) => setResolutionNote(event.target.value)}
            maxLength={2000}
            placeholder="Зафиксируйте результат проверки или важный контекст."
            className="mt-2"
          />
        </label>
        <div className="mt-2 flex items-start justify-between gap-4">
          {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : <span />}
          <p className="shrink-0 text-xs text-white/62">{resolutionNote.length}/2000</p>
        </div>
      </MenariumDialog>
    </>
  );
}
