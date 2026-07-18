"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type FavoritesLiveStateValue = {
  favoriteOverrides: Record<string, boolean>;
  total: number;
  updateFavorite: (itemId: string, favorite: boolean) => void;
};

const FavoritesLiveStateContext = createContext<FavoritesLiveStateValue | null>(null);

export function FavoritesLiveState({
  initialTotal,
  initialFavoriteIds,
  children,
}: {
  initialTotal: number;
  initialFavoriteIds: string[];
  children: ReactNode;
}) {
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const initialFavorites = new Set(initialFavoriteIds);
  let total = initialTotal;

  for (const [itemId, favorite] of Object.entries(favoriteOverrides)) {
    const initiallyFavorite = initialFavorites.has(itemId);
    if (favorite && !initiallyFavorite) total += 1;
    if (!favorite && initiallyFavorite) total -= 1;
  }

  function updateFavorite(itemId: string, favorite: boolean) {
    setFavoriteOverrides((current) => {
      if (initialFavorites.has(itemId) === favorite) {
        const next = { ...current };
        delete next[itemId];
        return next;
      }

      if (current[itemId] === favorite) return current;
      return { ...current, [itemId]: favorite };
    });
  }

  return (
    <FavoritesLiveStateContext.Provider value={{ favoriteOverrides, total, updateFavorite }}>
      {children}
    </FavoritesLiveStateContext.Provider>
  );
}

export function useFavoritesLiveState() {
  return useContext(FavoritesLiveStateContext);
}

export function FavoriteCount() {
  const state = useFavoritesLiveState();
  return <strong className="text-white/88">{state?.total ?? 0}</strong>;
}

export function FavoriteItemSlot({ itemId, children }: { itemId: string; children: ReactNode }) {
  const state = useFavoritesLiveState();
  if (state?.favoriteOverrides[itemId] === false) return null;
  return children;
}

export function FavoritesSavedContent({
  children,
  emptyState,
}: {
  children: ReactNode;
  emptyState: ReactNode;
}) {
  const state = useFavoritesLiveState();
  return state && state.total <= 0 ? emptyState : children;
}
