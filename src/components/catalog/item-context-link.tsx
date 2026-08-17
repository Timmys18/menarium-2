"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { rememberCatalogPosition } from "./catalog-scroll-restoration";

type ItemContextLinkProps = Omit<ComponentProps<typeof Link>, "href" | "children"> & {
  children: ReactNode;
  href: string;
  returnHref?: string;
};

/** Keeps the catalog in place so opening an item never feels like losing the browse session. */
export function ItemContextLink({ href, returnHref, onClick, children, ...props }: ItemContextLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      transitionTypes={["item-open"]}
      onClick={(event) => {
        if (returnHref && !event.defaultPrevented) rememberCatalogPosition(returnHref);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
