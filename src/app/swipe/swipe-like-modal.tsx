"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";

type UserItem = { id: string; title: string };

export function SwipeLikeModal({
  open,
  receiverItemId,
  receiverTitle,
  userItems,
  onClose,
  onSuccess,
}: {
  open: boolean;
  receiverItemId: string;
  receiverTitle: string;
  userItems: UserItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [senderItemId, setSenderItemId] = useState(userItems[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    if (!senderItemId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderItemId, receiverItemId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Не удалось отправить предложение");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <GlassCard className="w-full max-w-md rounded-3xl p-6">
        <h3 className="text-xl font-semibold">Предложить обмен</h3>
        <p className="mt-2 text-sm text-white/55">
          Вы хотите обменять своё объявление на «{receiverTitle}».
        </p>
        <label className="mt-5 block text-sm text-white/50">Ваше объявление</label>
        <select
          value={senderItemId}
          onChange={(e) => setSenderItemId(e.target.value)}
          className="glass-card mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
        >
          {userItems.map((item) => (
            <option key={item.id} value={item.id} className="bg-[#0a0a0f] text-white">
              {item.title}
            </option>
          ))}
        </select>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <MenariumButton variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Отмена
          </MenariumButton>
          <MenariumButton className="flex-1" onClick={() => void submit()} disabled={loading || !senderItemId}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отправить"}
          </MenariumButton>
        </div>
      </GlassCard>
    </div>
  );
}
