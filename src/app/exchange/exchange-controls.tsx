"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ChatConversation, type ChatMessageView } from "@/components/chat/chat-conversation";
import { MenariumButton } from "@/components/menarium/button";
import { ConfirmDialog } from "@/components/menarium/dialog";

type ExchangeAction = "accept" | "decline" | "revoke" | "complete" | "cancel";
type ExchangeStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED";
type ExchangeSnapshot = {
  status: ExchangeStatus;
  senderCompleted: boolean;
  receiverCompleted: boolean;
};

const confirmMessages: Record<ExchangeAction, string> = {
  accept: "Принять предложение обмена? Объявления перейдут в статус «В сделке».",
  decline: "Отклонить предложение? Отправитель получит уведомление.",
  revoke: "Отозвать своё предложение обмена?",
  complete: "Подтвердить завершение обмена? После подтверждения обеими сторонами объявления будут архивированы.",
  cancel: "Отменить активный обмен? Объявления снова станут доступны для обмена.",
};

export function ExchangeActionPanel({
  swapId,
  status,
  isSender,
  isReceiver,
  senderCompleted,
  receiverCompleted,
  onSwapUpdated,
}: {
  swapId: string;
  status: ExchangeStatus;
  isSender: boolean;
  isReceiver: boolean;
  senderCompleted: boolean;
  receiverCompleted: boolean;
  onSwapUpdated?: (snapshot: ExchangeSnapshot) => void;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ExchangeAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<ExchangeAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: ExchangeAction) {
    setError(null);
    setPendingAction(action);
    try {
      const response = await fetch("/api/exchange", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapId, action }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: ExchangeSnapshot;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Не удалось выполнить действие");
      if (body.data) onSwapUpdated?.(body.data);
      setConfirmAction(null);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Не удалось выполнить действие");
    } finally {
      setPendingAction(null);
    }
  }

  const hasActions = status === "PENDING" || status === "ACCEPTED";
  const alreadyCompleted = (isSender && senderCompleted) || (isReceiver && receiverCompleted);
  const waitingForPartner =
    status === "ACCEPTED" && alreadyCompleted && !(senderCompleted && receiverCompleted);

  if (!hasActions) return null;

  return (
    <div className="mb-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {waitingForPartner ? (
        <p className="rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-200">
          Вы подтвердили завершение. Ожидаем подтверждения от партнёра — ему придёт уведомление.
        </p>
      ) : null}
      {status === "PENDING" && isReceiver ? (
        <div className="grid grid-cols-2 gap-2">
          <MenariumButton size="sm" onClick={() => setConfirmAction("accept")} disabled={Boolean(pendingAction)}>
            {pendingAction === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Принять
          </MenariumButton>
          <MenariumButton size="sm" variant="danger" onClick={() => setConfirmAction("decline")} disabled={Boolean(pendingAction)}>
            {pendingAction === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Отклонить
          </MenariumButton>
        </div>
      ) : null}

      {status === "PENDING" && isSender ? (
        <MenariumButton size="sm" variant="danger" className="w-full" onClick={() => setConfirmAction("revoke")} disabled={Boolean(pendingAction)}>
          {pendingAction === "revoke" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Отозвать предложение
        </MenariumButton>
      ) : null}

      {status === "ACCEPTED" ? (
        <div className="space-y-2">
          <MenariumButton size="sm" className="w-full" onClick={() => setConfirmAction("complete")} disabled={Boolean(pendingAction) || alreadyCompleted}>
            {pendingAction === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {alreadyCompleted ? "Вы подтвердили завершение" : "Подтвердить завершение"}
          </MenariumButton>
          <MenariumButton size="sm" variant="danger" className="w-full" onClick={() => setConfirmAction("cancel")} disabled={Boolean(pendingAction)}>
            {pendingAction === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Отменить обмен
          </MenariumButton>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <ConfirmDialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction) void runAction(confirmAction);
        }}
        title="Подтвердите действие"
        description={confirmAction ? confirmMessages[confirmAction] : ""}
        confirmLabel={
          confirmAction === "accept"
            ? "Принять обмен"
            : confirmAction === "complete"
              ? "Подтвердить завершение"
              : "Продолжить"
        }
        pending={Boolean(pendingAction)}
        danger={confirmAction === "decline" || confirmAction === "revoke" || confirmAction === "cancel"}
      />
    </div>
  );
}

export function ExchangeDealPanel({
  swapId,
  status,
  isSender,
  isReceiver,
  senderCompleted,
  receiverCompleted,
  currentUserId,
  messages,
  nextCursor,
}: ExchangeSnapshot & {
  swapId: string;
  isSender: boolean;
  isReceiver: boolean;
  currentUserId: string;
  messages: ChatMessageView[];
  nextCursor: string | null;
}) {
  const [snapshot, setSnapshot] = useState<ExchangeSnapshot>({
    status,
    senderCompleted,
    receiverCompleted,
  });

  return (
    <>
      <ExchangeActionPanel
        swapId={swapId}
        status={snapshot.status}
        isSender={isSender}
        isReceiver={isReceiver}
        senderCompleted={snapshot.senderCompleted}
        receiverCompleted={snapshot.receiverCompleted}
        onSwapUpdated={setSnapshot}
      />
      <ChatConversation
        target={{ endpoint: `/api/exchange/${swapId}/messages`, entityId: swapId }}
        currentUserId={currentUserId}
        initialMessages={messages}
        initialNextCursor={nextCursor}
        realtimeTypes={["deal-message", "swap"]}
        canWrite={snapshot.status === "ACCEPTED"}
        placeholder="Сообщение..."
        disabledPlaceholder="Чат закрыт для новых сообщений"
        emptyMessage="Сообщений по этой сделке пока нет."
      />
    </>
  );
}
