"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, LoaderCircle } from "lucide-react";
import { useFavoritesLiveState } from "@/features/favorites/live-state";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  itemId,
  itemTitle,
  initialFavorite = false,
  authenticated,
  loginHref,
  showLabel = false,
  className,
}: {
  itemId: string;
  itemTitle: string;
  initialFavorite?: boolean;
  authenticated: boolean;
  loginHref?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const favoritesLiveState = useFavoritesLiveState();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function toggleFavorite() {
    if (!authenticated) {
      if (loginHref) router.push(loginHref);
      return;
    }
    if (pending) return;

    const nextFavorite = !favorite;
    setFavorite(nextFavorite);
    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/items/${itemId}/favorite`, {
        method: nextFavorite ? "PUT" : "DELETE",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { favorite?: boolean };
      };
      if (!response.ok) throw new Error(body.error || "Не удалось обновить избранное");

      const confirmedFavorite = body.data?.favorite ?? nextFavorite;
      setFavorite(confirmedFavorite);
      favoritesLiveState?.updateFavorite(itemId, confirmedFavorite);
      router.refresh();
    } catch (requestError) {
      setFavorite(!nextFavorite);
      setError(requestError instanceof Error ? requestError.message : "Не удалось обновить избранное");
    } finally {
      setPending(false);
    }
  }

  const label = authenticated
    ? favorite
      ? `Убрать «${itemTitle}» из избранного`
      : `Сохранить «${itemTitle}» в избранное`
    : `Войти, чтобы сохранить «${itemTitle}»`;

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={authenticated ? favorite : undefined}
        title={error || label}
        disabled={pending}
        onClick={toggleFavorite}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border px-3 text-sm font-semibold backdrop-blur-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-wait",
          favorite
            ? "border-rose-300/25 bg-rose-400/16 text-danger shadow-[0_10px_28px_rgba(244,114,182,0.16)]"
            : "border-line-default bg-[var(--surface-sunken)]/82 text-text-muted hover:border-line-strong hover:bg-[var(--surface-input)]/92 hover:text-text-primary",
          !showLabel && "h-11 w-11 px-0",
        )}
      >
        {pending ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <Heart className={cn("h-5 w-5", favorite && "fill-current")} />
        )}
        {showLabel ? (
          <span className="hidden sm:inline">{favorite ? "Сохранено" : "Сохранить"}</span>
        ) : null}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {error}
      </span>
    </span>
  );
}
