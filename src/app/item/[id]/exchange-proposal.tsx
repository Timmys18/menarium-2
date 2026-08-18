"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumSelect } from "@/components/menarium/select";
import { trackClientProductEvent } from "@/lib/product-analytics-client";
import { navigateWithViewTransition } from "@/lib/view-transition";

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
      await navigateWithViewTransition(
        () => router.push(`/exchange?tab=outgoing&swap=${body.data.id}&notice=sent`),
        ["exchange-proposed"],
      );
    } catch (proposalError) {
      setError(proposalError instanceof Error ? proposalError.message : "Не удалось создать обмен");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (userItems.length === 0) {
    const returnTo = encodeURIComponent(`/item/${receiverItemId}`);

    return (
      <div id="exchange-proposal" className="flex-1 scroll-mt-28">
        <MenariumLinkButton href={`/new?returnTo=${returnTo}`} className="w-full">
          Создать объявление и продолжить
        </MenariumLinkButton>
      </div>
    );
  }

  return (
    <div id="exchange-proposal" className="flex-1 scroll-mt-28 space-y-3 rounded-md border border-teal-300/[0.16] bg-teal-300/[0.045] p-3.5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor="exchange-sender-item" className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-100/76">
            Вы отдаёте
          </label>
          <p id="exchange-receiver-item" className="mt-1 truncate text-xs text-white/62">
            Получаете: {receiverTitle}
          </p>
        </div>
        <ArrowRightLeft className="h-4 w-4 shrink-0 text-teal-200/70" />
      </div>
      <MenariumSelect
        id="exchange-sender-item"
        ariaLabel="Ваша вещь для обмена"
        value={senderItemId}
        options={userItems.map((item) => ({ value: item.id, label: item.title }))}
        onChange={setSenderItemId}
        placeholder="Выберите свою вещь"
      />
      <MenariumButton onClick={propose} disabled={isSubmitting || !senderItemId} className="w-full">
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRightLeft className="h-5 w-5" />}
        Предложить обмен
      </MenariumButton>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
