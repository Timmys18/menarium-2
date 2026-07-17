"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePause, Loader2, Play } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";
import { MenariumDialog } from "@/components/menarium/dialog";

type LifecycleAction = "pause" | "resume";

export function ItemLifecycleAction({
  itemId,
  action,
  successHref,
}: {
  itemId: string;
  action: LifecycleAction;
  successHref: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAction() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Не удалось изменить объявление");
      }
      setConfirmOpen(false);
      router.push(successHref);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Не удалось изменить объявление");
    } finally {
      setPending(false);
    }
  }

  if (action === "resume") {
    return (
      <div className="flex-1">
        <MenariumButton
          size="sm"
          className="w-full"
          onClick={() => void runAction()}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Вернуть в каталог
        </MenariumButton>
        {error ? <p role="alert" className="mt-2 text-xs text-red-200">{error}</p> : null}
      </div>
    );
  }

  return (
    <>
      <MenariumButton
        size="sm"
        variant="ghost"
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
      >
        <CirclePause className="h-4 w-4" />
        На паузу
      </MenariumButton>
      {error ? <p role="alert" className="w-full text-xs text-red-200">{error}</p> : null}
      <MenariumDialog
        open={confirmOpen}
        onClose={pending ? () => undefined : () => setConfirmOpen(false)}
        title="Приостановить объявление?"
        description="Оно исчезнет из каталога и свайпа, но все данные и фотографии сохранятся. Вернуть публикацию можно в любой момент."
        footer={
          <>
            <MenariumButton
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Оставить опубликованным
            </MenariumButton>
            <MenariumButton onClick={() => void runAction()} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CirclePause className="h-4 w-4" />}
              Приостановить
            </MenariumButton>
          </>
        }
      >
        {error ? (
          <p role="alert" className="rounded-[14px] border border-red-400/25 bg-red-400/[0.08] p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </MenariumDialog>
    </>
  );
}
