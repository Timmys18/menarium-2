import type { ReactNode } from "react";
import { Navigation } from "@/components/layout/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";

export async function AppShell({ children }: { children: ReactNode }) {
  const userId = await getCurrentUserId();
  const unreadCount = userId
    ? await prisma.notification.count({ where: { userId, isRead: false } })
    : 0;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="dot-grid-bg fixed inset-0 pointer-events-none opacity-60" />
      <div className="fixed left-1/4 top-0 h-96 w-96 rounded-full bg-teal-500/20 blur-[128px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 h-96 w-96 rounded-full bg-purple-500/20 blur-[128px] pointer-events-none" />
      <Navigation unreadCount={unreadCount} />
      <main className="relative z-10">{children}</main>
    </div>
  );
}
