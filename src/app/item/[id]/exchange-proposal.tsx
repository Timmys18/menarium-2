"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";

type UserItemOption = {
  id: string;
  title: string;
};

export function ExchangeProposal({
  receiverItemId,
  userItems,
}: {
  receiverItemId: string;
  userItems: UserItemOption[];
}) {
  const router = useRouter();
  const [senderItemId, setSenderItemId] = useState(userItems[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function propose() {
    if (!senderItemId) return;
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
    return (
      <MenariumLinkButton href="/new" className="flex-1">
        Создать свое объявление
      </MenariumLinkButton>
    );
  }

  return (
    <div className="flex-1 space-y-3">
      <select
        value={senderItemId}
        onChange={(event) => setSenderItemId(event.target.value)}
        className="glass-card w-full rounded-2xl px-4 py-3 text-sm text-white outline-none"
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
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
