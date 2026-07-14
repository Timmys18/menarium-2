import type { ReactNode } from "react";
import { RealtimeProvider } from "@/components/hooks/use-realtime";
import { NavigationWithPolling } from "@/components/layout/navigation-with-polling";
import { SiteFooter } from "@/components/layout/site-footer";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";

export async function AppShell({ children }: { children: ReactNode }) {
  const userId = await getCurrentUserId();
  const [unreadCount, pendingSwaps] = userId
    ? await Promise.all([
        prisma.notification.count({ where: { userId, isRead: false } }).catch(() => 0),
        prisma.swapRequest
          .count({ where: { receiverId: userId, status: "PENDING" } })
          .catch(() => 0),
      ])
    : [0, 0];

  return (
    <RealtimeProvider enabled={Boolean(userId)}>
      <div className="relative min-h-screen overflow-hidden">
        <div className="dot-grid-bg pointer-events-none fixed inset-0 opacity-60" />
        <div className="pointer-events-none fixed left-1/4 top-0 h-96 w-96 rounded-full bg-teal-500/20 blur-[128px]" />
        <div className="pointer-events-none fixed bottom-0 right-1/4 h-96 w-96 rounded-full bg-purple-500/20 blur-[128px]" />
        <NavigationWithPolling initialUnreadCount={unreadCount} initialPendingSwaps={pendingSwaps} />
        <main className="relative z-10">{children}</main>
        <SiteFooter />
      </div>
    </RealtimeProvider>
  );
}
