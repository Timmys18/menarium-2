"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, RotateCcw } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";
import { MenariumDialog } from "@/components/menarium/dialog";
import { MenariumTextarea } from "@/components/menarium/input";

type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export function UserModerationActions({
  userId,
  status,
  isCurrentAdmin,
}: {
  userId: string;
  status: UserStatus;
  isCurrentAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restoring = status === "SUSPENDED";

  function closeDialog() {
    if (!pending) {
      setOpen(false);
      setError(null);
    }
  }

  async function updateStatus() {
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError(restoring ? "Укажите причину восстановления" : "Укажите причину приостановки");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: restoring ? "ACTIVE" : "SUSPENDED",
          reason: normalizedReason,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось изменить статус пользователя");

      setOpen(false);
      setReason("");
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Не удалось изменить статус пользователя",
      );
    } finally {
      setPending(false);
    }
  }

  if (status === "DELETED") {
    return <p className="text-xs text-white/62">Удалённый аккаунт нельзя восстановить здесь</p>;
  }

  return (
    <>
      <MenariumButton
        size="sm"
        variant={restoring ? "secondary" : "danger"}
        onClick={() => setOpen(true)}
        disabled={isCurrentAdmin}
        title={isCurrentAdmin ? "Нельзя изменить статус собственного аккаунта" : undefined}
      >
        {restoring ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
        {restoring ? "Восстановить" : "Приостановить"}
      </MenariumButton>

      <MenariumDialog
        open={open}
        onClose={closeDialog}
        title={restoring ? "Восстановить доступ?" : "Приостановить аккаунт?"}
        description={
          restoring
            ? "Пользователь снова сможет войти в аккаунт. Его объявления останутся в архиве до проверки."
            : "Активные обмены будут отменены, объявления уйдут в архив, а текущие сессии завершатся."
        }
        danger={!restoring}
        footer={
          <>
            <MenariumButton variant="secondary" onClick={closeDialog} disabled={pending}>
              Отмена
            </MenariumButton>
            <MenariumButton
              variant={restoring ? "primary" : "danger"}
              onClick={() => void updateStatus()}
              disabled={pending || !reason.trim()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {restoring ? "Восстановить" : "Приостановить"}
            </MenariumButton>
          </>
        }
      >
        <label className="block text-sm text-white/78">
          Причина <span className="text-red-300">*</span>
          <MenariumTextarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (error) setError(null);
            }}
            maxLength={1000}
            required
            autoFocus
            placeholder={
              restoring
                ? "Почему доступ можно восстановить?"
                : "Укажите нарушение или основание для приостановки."
            }
            className="mt-2"
          />
        </label>
        <div className="mt-2 flex items-start justify-between gap-4">
          {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : <span />}
          <p className="shrink-0 text-xs text-white/62">{reason.length}/1000</p>
        </div>
      </MenariumDialog>
    </>
  );
}
