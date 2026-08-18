"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";
import { ConfirmDialog } from "@/components/menarium/dialog";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteItem() {
    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось удалить объявление");
      setDialogOpen(false);
      router.push(body.data?.archived ? "/profile?status=history" : "/profile");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить объявление");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <MenariumButton variant="danger" className="w-full" onClick={() => setDialogOpen(true)} disabled={isDeleting}>
        {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
        Удалить объявление
      </MenariumButton>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ConfirmDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={() => void deleteItem()}
        title="Удалить объявление?"
        description="Если по объявлению уже были завершённые обмены, мы снимем его с публикации, но сохраним в истории сделок."
        confirmLabel="Удалить объявление"
        pending={isDeleting}
        danger
      />
    </div>
  );
}
