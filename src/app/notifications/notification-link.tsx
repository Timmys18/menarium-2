"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NotificationLink({
  id,
  href,
  children,
  isRead,
  className,
}: {
  id: string;
  href: string;
  children: ReactNode;
  isRead: boolean;
  className?: string;
}) {
  async function markReadIfNeeded() {
    if (isRead) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // Навигация важнее — не блокируем переход
    }
  }

  return (
    <Link href={href} onClick={() => void markReadIfNeeded()} className={cn(className)}>
      {children}
    </Link>
  );
}
