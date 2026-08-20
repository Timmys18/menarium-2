"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ChatConversation, type ChatMessageView } from "@/components/chat/chat-conversation";
import { BrandMark } from "@/components/menarium/brand";
import { MenariumButton } from "@/components/menarium/button";
import { ConfirmDialog } from "@/components/menarium/dialog";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";
import { chatWithLabel } from "@/lib/russian";
import { navigateWithViewTransition } from "@/lib/view-transition";

type ExchangeAction = "accept" | "decline" | "revoke" | "complete" | "cancel";
type ExchangeStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
type ExchangeSnapshot = {
  status: ExchangeStatus;
  senderCompleted: boolean;
  receiverCompleted: boolean;
};

const confirmMessages: Record<ExchangeAction, string> = {
  accept: "Принять предложение обмена? Обе вещи будут зарезервированы для этой сделки, а затем откроется чат для договорённостей.",
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
  acceptedHref,
  onSwapUpdated,
}: {
  swapId: string;
  status: ExchangeStatus;
  isSender: boolean;
  isReceiver: boolean;
  senderCompleted: boolean;
  receiverCompleted: boolean;
  acceptedHref?: string;
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
      setConfirmAction(null);
      if (action === "accept" && acceptedHref) {
        await navigateWithViewTransition(() => router.replace(acceptedHref), ["exchange-accepted"]);
        return;
      }
      if (body.data) {
        onSwapUpdated?.(body.data as ExchangeSnapshot);
      }
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Не удалось выполнить действие");
    } finally {
      if (!(action === "accept" && acceptedHref)) setPendingAction(null);
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
      : "Завершение обмена";
  const actionDescription =
    status === "PENDING"
      ? isReceiver
        ? "Сверьте обе стороны обмена перед решением."
        : "До ответа предложение можно отозвать."
      : "Подтвердите завершение, когда договорённость выполнена.";

  if (!hasActions) return null;

  return (
    <section
      className={`mb-5 space-y-3 rounded-md border border-line-default bg-fill-1 p-4 ${status === "ACCEPTED" ? "mt-5" : ""}`}
      aria-labelledby="exchange-actions-title"
    >
      <div>
        <h3 id="exchange-actions-title" className="text-sm font-semibold text-text-strong">
          {actionTitle}
        </h3>
        <p className="mt-1 text-xs leading-5 text-text-subtle">{actionDescription}</p>
      </div>
      {waitingForPartner ? (
        <p aria-live="polite" className="rounded-xs border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm text-accent">
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
            className="w-full text-danger hover:bg-red-400/[0.07] hover:text-danger"
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
          className="w-full text-danger hover:bg-red-400/[0.07] hover:text-danger"
          onClick={() => setConfirmAction("revoke")}
          disabled={Boolean(pendingAction)}
        >
          {pendingAction === "revoke" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Отозвать предложение
        </MenariumButton>
      ) : null}

      {status === "ACCEPTED" ? (
        <div className="space-y-2">
          <MenariumButton
            size="sm"
            className="w-full"
            onClick={() => setConfirmAction("complete")}
            disabled={Boolean(pendingAction) || alreadyCompleted}
          >
            {pendingAction === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {alreadyCompleted
              ? "Вы подтвердили завершение"
              : "Подтвердить завершение"}
          </MenariumButton>
          <MenariumButton
            size="sm"
            variant="ghost"
            className="w-full text-danger hover:bg-red-400/[0.07] hover:text-danger"
            onClick={() => setConfirmAction("cancel")}
            disabled={Boolean(pendingAction)}
          >
            {pendingAction === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Отменить обмен
          </MenariumButton>
        </div>
      ) : null}

      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
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

function ExchangeProgress({
  snapshot,
  isSender,
  isReceiver,
}: {
  snapshot: ExchangeSnapshot;
  isSender: boolean;
  isReceiver: boolean;
}) {
  const participantCompleted =
    (isSender && snapshot.senderCompleted) || (isReceiver && snapshot.receiverCompleted);
  const partnerCompleted =
    (isSender && snapshot.receiverCompleted) || (isReceiver && snapshot.senderCompleted);
  const accepted = snapshot.status === "ACCEPTED" || snapshot.status === "COMPLETED";
  const completed = snapshot.status === "COMPLETED";
  const terminal = ["DECLINED", "CANCELLED", "EXPIRED"].includes(snapshot.status);
  const currentStep = terminal
    ? 1
    : snapshot.status === "PENDING"
      ? 1
      : completed
        ? 3
        : participantCompleted || partnerCompleted
          ? 3
          : 2;
  const summary = terminal
    ? "Предложение закрыто"
    : snapshot.status === "PENDING"
      ? isReceiver
        ? "Нужно ваше решение"
        : "Ожидаем решение партнёра"
      : completed
        ? "Обмен завершён обеими сторонами"
        : participantCompleted
          ? "Ожидаем подтверждение партнёра"
          : partnerCompleted
            ? "Нужно ваше подтверждение"
            : "Договоритесь о деталях в чате";
  const steps = [
    { label: "Предложение", detail: "Отправлено", done: true },
    {
      label: "Решение",
      detail: terminal ? "Закрыто" : accepted ? "Принято" : isReceiver ? "Ваш ход" : "Ожидание",
      done: accepted,
    },
    {
      label: "Договорённость",
      detail: accepted ? (participantCompleted || partnerCompleted ? "Согласовано" : "В чате") : "После принятия",
      done: completed || (accepted && (participantCompleted || partnerCompleted)),
    },
    {
      label: "Завершение",
      detail: completed ? "Подтверждено" : participantCompleted ? "Ждём партнёра" : partnerCompleted ? "Ваш ход" : "Обе стороны",
      done: completed,
    },
  ];

  return (
      <section
        key={`${snapshot.status}:${snapshot.senderCompleted}:${snapshot.receiverCompleted}`}
        className="exchange-progress-panel mb-5 rounded-md border border-line-default bg-fill-1 p-4"
        aria-labelledby="exchange-progress-title"
        data-exchange-progress={snapshot.status.toLowerCase()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="exchange-progress-title" className="text-sm font-semibold text-text-strong">
            Этапы обмена
          </h3>
          <p aria-live="polite" className="text-right text-xs font-medium text-accent">
            {summary}
          </p>
        </div>
        <ol className="grid gap-2 sm:grid-cols-4" aria-label="Последовательность обмена">
          {steps.map((step, index) => {
            const isCurrent = index === currentStep && !step.done;
            const isUnavailable = terminal && index > 1;
            return (
              <li
                key={step.label}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex min-w-0 items-center gap-3 rounded-control border px-3 py-2.5 sm:block ${
                  step.done
                    ? "border-teal-300/20 bg-teal-300/[0.07]"
                    : isCurrent
                      ? "border-blue-300/30 bg-blue-400/[0.09]"
                      : "border-line-hairline bg-fill-1"
                } ${isUnavailable ? "opacity-55" : ""}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:mb-2 ${
                    step.done
                      ? "bg-teal-300 text-on-accent"
                      : isCurrent
                        ? "bg-blue-400 text-white"
                        : "bg-fill-3 text-text-subtle"
                  }`}
                  aria-hidden="true"
                >
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-text-strong">{step.label}</span>
                  <span className="mt-0.5 block text-micro leading-4 text-text-subtle">{step.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>
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
  communicationBlocked,
  acceptedHref,
  currentUserId,
  partnerName,
  messages,
  nextCursor,
  itemContext,
}: ExchangeSnapshot & {
  swapId: string;
  isSender: boolean;
  isReceiver: boolean;
  currentUserId: string;
  partnerName: string;
  messages: ChatMessageView[];
  nextCursor: string | null;
  communicationBlocked: boolean;
  acceptedHref?: string;
  itemContext: {
    yourTitle: string;
    yourImage: string;
    theirTitle: string;
    theirImage: string;
  };
}) {
  const [snapshot, setSnapshot] = useState<ExchangeSnapshot>({
    status,
    senderCompleted,
    receiverCompleted,
  });

  useEffect(() => {
    startTransition(() => {
      setSnapshot({ status, senderCompleted, receiverCompleted });
    });
  }, [receiverCompleted, senderCompleted, status]);
  const disabledPlaceholder =
    communicationBlocked
      ? "Переписка недоступна из-за блокировки"
      : snapshot.status === "PENDING"
      ? "Чат откроется после принятия предложения"
      : snapshot.status === "COMPLETED"
        ? "Обмен завершён, чат доступен только для чтения"
        : "Обмен закрыт, чат доступен только для чтения";
  const chatSection = (
    <section
      id="exchange-chat"
      className="min-w-0 max-w-full scroll-mt-24 overflow-hidden rounded-card border border-line-default bg-[var(--surface-sunken)]/72"
      tabIndex={-1}
      aria-labelledby="exchange-chat-title"
    >
      <div className="border-b border-line-hairline px-4 py-3.5">
        <h3 id="exchange-chat-title" className="font-semibold text-text-strong">
          {chatWithLabel(partnerName)}
        </h3>
        {communicationBlocked ? (
          <p className="mt-1 text-xs text-text-subtle">Новые сообщения недоступны.</p>
        ) : null}
      </div>
      <div className="mx-4 mt-4 grid grid-cols-[44px_minmax(0,1fr)_auto_minmax(0,1fr)_44px] items-center gap-2 rounded-control border border-line-hairline bg-fill-1 p-2.5">
        <span className="relative h-11 w-11 overflow-hidden rounded-xs border border-line-hairline bg-fill-1">
          <ItemCoverImage src={itemContext.yourImage} alt="" sizes="44px" />
        </span>
        <span className="min-w-0 truncate text-right text-xs font-medium text-text-subtle">
          {itemContext.yourTitle}
        </span>
        <BrandMark size="xs" className="h-6 w-6" />
        <span className="min-w-0 truncate text-xs font-medium text-text-muted">
          {itemContext.theirTitle}
        </span>
        <span className="relative h-11 w-11 overflow-hidden rounded-xs border border-line-hairline bg-fill-1">
          <ItemCoverImage src={itemContext.theirImage} alt="" sizes="44px" />
        </span>
      </div>
      <div className="min-w-0 p-4">
        <ChatConversation
          target={{ endpoint: `/api/exchange/${swapId}/messages`, entityId: swapId }}
          currentUserId={currentUserId}
          initialMessages={messages}
          initialNextCursor={nextCursor}
          realtimeTypes={["deal-message", "swap"]}
          canWrite={snapshot.status === "ACCEPTED" && !communicationBlocked}
          placeholder="Сообщение…"
          disabledPlaceholder={disabledPlaceholder}
          emptyMessage="Сообщений пока нет."
          draftKey={`deal:${swapId}`}
          kind="DEAL"
        />
      </div>
    </section>
  );
  const actionPanel = (
    <ExchangeActionPanel
      swapId={swapId}
      status={snapshot.status}
      isSender={isSender}
      isReceiver={isReceiver}
      senderCompleted={snapshot.senderCompleted}
      receiverCompleted={snapshot.receiverCompleted}
      acceptedHref={acceptedHref}
      onSwapUpdated={setSnapshot}
    />
  );

  return (
    <>
      <ExchangeProgress snapshot={snapshot} isSender={isSender} isReceiver={isReceiver} />
      {snapshot.status === "ACCEPTED" ? chatSection : actionPanel}
      {snapshot.status === "ACCEPTED" ? actionPanel : chatSection}
    </>
  );
}
