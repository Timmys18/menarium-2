"use client";

import { Heart, Info, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MenariumLinkButton } from "@/components/menarium/button";

type Props = {
  itemId: string;
};

export function SwipeActions({ itemId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function passCard() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/items/swipe/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) throw new Error("pass failed");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-6">
      <button
        type="button"
        disabled={loading}
        onClick={() => void passCard()}
        className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10 disabled:opacity-50"
        aria-label="Пропустить"
      >
        <X className="h-8 w-8 text-red-400" />
      </button>
      <MenariumLinkButton href={`/item/${itemId}`} variant="secondary" className="h-16 w-16 rounded-full p-0">
        <Info className="h-7 w-7 text-blue-400" />
      </MenariumLinkButton>
      <MenariumLinkButton href={`/item/${itemId}`} className="h-16 w-16 rounded-full p-0">
        <Heart className="h-8 w-8 text-white" />
      </MenariumLinkButton>
    </div>
  );
}
