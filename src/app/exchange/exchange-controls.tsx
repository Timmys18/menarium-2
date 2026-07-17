"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ChatConversation, type ChatMessageView } from "@/components/chat/chat-conversation";
import { MenariumButton } from "@/components/menarium/button";
import { ConfirmDialog } from "@/components/menarium/dialog";

type ExchangeAction = "accept" | "decline" | "revoke" | "complete" | "cancel";
type ExchangeStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
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
  handoffReady = false,
  onSwapUpdated,
}: {
  swapId: string;
  status: ExchangeStatus;
  isSender: boolean;
  isReceiver: boolean;
  senderCompleted: boolean;
  receiverCompleted: boolean;
  handoffReady?: boolean;
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
  const actionTitle =
    status === "PENDING"
      ? isReceiver
        ? "Ваше решение"
        : "Предложение отправлено"
      : "После передачи вещи";
  const actionDescription =
    status === "PENDING"
      ? isReceiver
        ? "Сначала сверьте обе вещи. После принятия откроется чат для договорённостей."
        : "Партнёр увидит предложение и примет решение. До этого его можно отозвать."
      : handoffReady
        ? "Подтверждайте завершение только после того, как обмен действительно состоялся."
        : "Сначала обе стороны должны согласовать и подтвердить передачу.";

  if (!hasActions) return null;

  return (
    <section className="mb-5 space-y-3 rounded-[18px] border border-white/10 bg-white/[0.03] p-4" aria-labelledby="exchange-actions-title">
      <div>
        <h3 id="exchange-actions-title" className="text-sm font-semibold text-white/88">
          {actionTitle}
        </h3>
        <p className="mt-1 text-xs leading-5 text-white/38">{actionDescription}</p>
      </div>
      {waitingForPartner ? (
        <p aria-live="polite" className="rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-200">
          Вы подтвердили завершение. Ожидаем подтверждения от партнёра — ему придёт уведомление.
        </p>
      ) : null}
      {status === "PENDING" && isReceiver ? (
        <div className="space-y-2">
          <MenariumButton className="w-full" size="sm" onClick={() => setConfirmAction("accept")} disabled={Boolean(pendingAction)}>
            {pendingAction === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Принять
          </MenariumButton>
          <MenariumButton
            className="w-full text-red-200/60 hover:bg-red-400/[0.07] hover:text-red-200"
            size="sm"
            variant="ghost"
            onClick={() => setConfirmAction("decline")}
            disabled={Boolean(pendingAction)}
          >
            {pendingAction === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Отклонить
          </MenariumButton>
        </div>
      ) : null}

      {status === "PENDING" && isSender ? (
        <MenariumButton
          size="sm"
          variant="ghost"
          className="w-full text-red-200/60 hover:bg-red-400/[0.07] hover:text-red-200"
          onClick={() => setConfirmAction("revoke")}
          disabled={Boolean(pendingAction)}
        >
          {pendingAction === "revoke" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Отозвать предложение
        </MenariumButton>
      ) : null}

      {status === "ACCEPTED" ? (
        <div className="space-y-2">
          {!handoffReady ? (
            <p className="rounded-xl border border-amber-300/14 bg-amber-300/[0.06] px-3.5 py-3 text-xs leading-5 text-amber-50/65">
              Завершение откроется, когда вы оба подтвердите способ и время передачи.
            </p>
          ) : null}
          <MenariumButton size="sm" className="w-full" onClick={() => setConfirmAction("complete")} disabled={Boolean(pendingAction) || alreadyCompleted || !handoffReady}>
            {pendingAction === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {alreadyCompleted
              ? "Вы подтвердили завершение"
              : handoffReady
                ? "Подтвердить завершение"
                : "Сначала подтвердите передачу"}
          </MenariumButton>
          <MenariumButton
            size="sm"
            variant="ghost"
            className="w-full text-red-200/60 hover:bg-red-400/[0.07] hover:text-red-200"
            onClick={() => setConfirmAction("cancel")}
            disabled={Boolean(pendingAction)}
          >
            {pendingAction === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Отменить обмен
          </MenariumButton>
        </div>
      ) : null}

      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
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
    </section>
  );
}

export function ExchangeDealPanel({
  swapId,
  status,
  isSender,
  isReceiver,
  senderCompleted,
  receiverCompleted,
  handoffReady,
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
  handoffReady: boolean;
}) {
  const [snapshot, setSnapshot] = useState<ExchangeSnapshot>({
    status,
    senderCompleted,
    receiverCompleted,
  });
  const disabledPlaceholder =
    snapshot.status === "PENDING"
      ? "Чат откроется после принятия предложения"
      : snapshot.status === "COMPLETED"
        ? "Обмен завершён, чат доступен только для чтения"
        : "Обмен закрыт, чат доступен только для чтения";

  return (
    <>
      <ExchangeActionPanel
        swapId={swapId}
        status={snapshot.status}
        isSender={isSender}
        isReceiver={isReceiver}
        senderCompleted={snapshot.senderCompleted}
        receiverCompleted={snapshot.receiverCompleted}
        handoffReady={handoffReady}
        onSwapUpdated={setSnapshot}
      />
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white/88">Чат сделки</h3>
          <p className="mt-1 text-xs text-white/35">
            {snapshot.status === "ACCEPTED" ? "Согласуйте место, время и способ передачи." : "История договорённостей хранится здесь."}
          </p>
        </div>
      </div>
      <ChatConversation
        target={{ endpoint: `/api/exchange/${swapId}/messages`, entityId: swapId }}
        currentUserId={currentUserId}
        initialMessages={messages}
        initialNextCursor={nextCursor}
        realtimeTypes={["deal-message", "swap"]}
        canWrite={snapshot.status === "ACCEPTED"}
        placeholder="Сообщение..."
        disabledPlaceholder={disabledPlaceholder}
        emptyMessage="Сообщений по этой сделке пока нет."
      />
    </>
  );
}
