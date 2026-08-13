"use client";

import { useEffect } from "react";

const contextKey = "menarium:catalog-return";

type CatalogReturnContext = {
  href: string;
  scrollY: number;
};

export function rememberCatalogPosition(href: string) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(contextKey, JSON.stringify({ href, scrollY: window.scrollY } satisfies CatalogReturnContext));
}

/** Restores the exact browsing position after a user returns from an item. */
export function CatalogScrollRestoration({ href }: { href: string }) {
  useEffect(() => {
    const rawContext = window.sessionStorage.getItem(contextKey);
    if (!rawContext) return;

    try {
      const context = JSON.parse(rawContext) as CatalogReturnContext;
      if (context.href !== href || !Number.isFinite(context.scrollY)) return;

      window.sessionStorage.removeItem(contextKey);
      window.requestAnimationFrame(() => window.scrollTo({ top: context.scrollY, behavior: "auto" }));
    } catch {
      window.sessionStorage.removeItem(contextKey);
    }
  }, [href]);

  return null;
}
