"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { navigateWithViewTransition } from "@/lib/view-transition";
import { rememberCatalogPosition } from "./catalog-scroll-restoration";

type ItemContextLinkProps = Omit<ComponentProps<typeof Link>, "href" | "children"> & {
  children: ReactNode;
  href: string;
  returnHref?: string;
};

/** Keeps the catalog in place so opening an item never feels like losing the browse session. */
export function ItemContextLink({ href, returnHref, onClick, children, ...props }: ItemContextLinkProps) {
  const router = useRouter();

  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        if (returnHref && !event.defaultPrevented) rememberCatalogPosition(returnHref);
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          void navigateWithViewTransition(() => router.push(href), ["item-open"]);
        }
      }}
    >
      {children}
    </Link>
  );
}
