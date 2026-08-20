"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ItemStatus } from "@prisma/client";
import { Archive, Loader2, RotateCcw } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";

export function ItemModerationActions({
  itemId,
  status,
}: {
  itemId: string;
  status: ItemStatus;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextStatus = status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";

  async function updateStatus() {
    setError(null);
    setIsPending(true);
    try {
      const response = await fetch(`/api/admin/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось обновить статус");
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Не удалось обновить статус");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <MenariumButton
        size="sm"
        variant={nextStatus === "ARCHIVED" ? "danger" : "secondary"}
        onClick={updateStatus}
        disabled={isPending || status === "IN_DEAL"}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : nextStatus === "ARCHIVED" ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
        {nextStatus === "ARCHIVED" ? "В архив" : "Вернуть"}
      </MenariumButton>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
