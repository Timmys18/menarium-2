"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { trackClientProductEvent } from "@/lib/product-analytics-client";

type UserItemOption = {
  id: string;
  title: string;
};

export function ExchangeProposal({
  receiverItemId,
  receiverTitle,
  userItems,
}: {
  receiverItemId: string;
  receiverTitle: string;
  userItems: UserItemOption[];
}) {
  const router = useRouter();
  const [senderItemId, setSenderItemId] = useState(userItems[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function propose() {
    if (!senderItemId) return;
    void trackClientProductEvent({ name: "exchange_proposal_started", path: "/item/[id]" });
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderItemId, receiverItemId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Не удалось создать обмен");
      router.push(`/exchange?swap=${body.data.id}`);
      router.refresh();
    } catch (proposalError) {
      setError(proposalError instanceof Error ? proposalError.message : "Не удалось создать обмен");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (userItems.length === 0) {
    const returnTo = encodeURIComponent(`/item/${receiverItemId}`);

    return (
      <MenariumLinkButton href={`/new?returnTo=${returnTo}`} className="flex-1">
        Создать объявление и продолжить
      </MenariumLinkButton>
    );
  }

  return (
    <div className="flex-1 space-y-3 rounded-[18px] border border-teal-300/[0.12] bg-teal-300/[0.035] p-3.5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor="exchange-sender-item" className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-100/60">
            Вы отдаёте
          </label>
          <p id="exchange-receiver-item" className="mt-1 truncate text-xs text-white/34">
            Получаете: {receiverTitle}
          </p>
        </div>
        <ArrowRightLeft className="h-4 w-4 shrink-0 text-teal-200/70" />
      </div>
      <select
        id="exchange-sender-item"
        value={senderItemId}
        onChange={(event) => setSenderItemId(event.target.value)}
        aria-describedby="exchange-receiver-item"
        className="min-h-12 w-full rounded-[14px] border border-white/10 bg-[#0d131d] px-4 py-3 text-sm text-white outline-none focus:border-blue-300/55 focus-visible:ring-2 focus-visible:ring-blue-300/50"
      >
        {userItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
      <MenariumButton onClick={propose} disabled={isSubmitting || !senderItemId} className="w-full">
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRightLeft className="h-5 w-5" />}
        Предложить обмен
      </MenariumButton>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
