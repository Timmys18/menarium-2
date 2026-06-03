"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteItem() {
    const confirmed = window.confirm("Удалить объявление? Это действие нельзя отменить.");
    if (!confirmed) return;

    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось удалить объявление");
      router.push("/my-items");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить объявление");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <MenariumButton variant="danger" className="w-full" onClick={deleteItem} disabled={isDeleting}>
        {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
        Удалить объявление
      </MenariumButton>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
