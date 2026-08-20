"use client";

import { useState } from "react";
import { ArrowRightLeft, BellRing, Loader2, ShieldCheck } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";
import { MenariumDialog } from "@/components/menarium/dialog";
import { MenariumSelect } from "@/components/menarium/select";
import { trackClientProductEvent } from "@/lib/product-analytics-client";

type UserItem = { id: string; title: string };

export function SwipeLikeModal({
  open,
  receiverItemId,
  receiverTitle,
  receiverWanted,
  userItems,
  onClose,
  onSuccess,
}: {
  open: boolean;
  receiverItemId: string;
  receiverTitle: string;
  receiverWanted: string;
  userItems: UserItem[];
  onClose: () => void;
  onSuccess: (swapId: string) => void;
}) {
  const [senderItemId, setSenderItemId] = useState(userItems[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const senderTitle = userItems.find((item) => item.id === senderItemId)?.title ?? "Ваше объявление";

  function close() {
    if (loading) return;
    setError(null);
    onClose();
  }

  async function submit() {
    if (!senderItemId) return;
    void trackClientProductEvent({ name: "exchange_proposal_started", path: "/swipe" });
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderItemId, receiverItemId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Не удалось отправить предложение");
      }
      if (typeof body?.data?.id !== "string") throw new Error("Не удалось открыть созданный обмен");
      onSuccess(body.data.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить предложение");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MenariumDialog
      open={open}
      onClose={close}
      title="Проверим предложение"
      description="Выберите вещь или услугу, которую готовы отдать. Перед отправкой всё можно изменить."
      footer={
        <>
          <MenariumButton variant="secondary" onClick={close} disabled={loading}>
            Назад
          </MenariumButton>
          <MenariumButton onClick={() => void submit()} disabled={loading || !senderItemId}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Отправить предложение
          </MenariumButton>
        </>
      }
    >
      <label htmlFor="swipe-sender-item" className="block text-sm font-medium text-text-subtle">
        Что готов отдать
      </label>
      <MenariumSelect
        id="swipe-sender-item"
        ariaLabel="Что готов отдать"
        className="mt-2"
        value={senderItemId}
        options={userItems.map((item) => ({ value: item.id, label: item.title }))}
        onChange={setSenderItemId}
        placeholder="Выберите свою вещь"
      />

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] items-center gap-2 rounded-md border border-line-hairline bg-fill-1 p-4">
        <div className="min-w-0">
          <span className="block text-micro font-semibold uppercase tracking-[0.12em] text-text-subtle">Вы отдаёте</span>
          <span className="mt-1 block truncate text-sm font-medium text-text-primary">{senderTitle}</span>
        </div>
        <ArrowRightLeft className="h-4 w-4 justify-self-center text-accent" />
        <div className="min-w-0 text-right">
          <span className="block text-micro font-semibold uppercase tracking-[0.12em] text-text-subtle">Получаешь</span>
          <span className="mt-1 block truncate text-sm font-medium text-text-primary">{receiverTitle}</span>
        </div>
      </div>

      <div className="mt-3 rounded-control border border-teal-300/[0.12] bg-teal-300/[0.045] px-3.5 py-3">
        <p className="text-micro font-semibold uppercase tracking-[0.13em] text-accent-soft">Владелец ищет</p>
        <p className="mt-1 text-sm leading-5 text-text-muted">{receiverWanted}</p>
      </div>

      <div className="mt-4 space-y-2 border-t border-line-hairline pt-4 text-xs leading-5 text-text-subtle">
        <p className="flex items-start gap-2">
          <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          Владелец получит уведомление и сможет принять или отклонить предложение.
        </p>
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          До ответа предложение можно отозвать. Оплата не требуется.
        </p>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-control border border-red-400/25 bg-red-400/[0.08] p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </MenariumDialog>
  );
}
