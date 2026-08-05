import type { ReactNode } from "react";
import { RealtimeProvider } from "@/components/hooks/use-realtime";
import { NavigationWithPolling } from "@/components/layout/navigation-with-polling";
import { SiteFooter } from "@/components/layout/site-footer";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";

export async function AppShell({
  children,
  mode = "app",
}: {
  children: ReactNode;
  mode?: "app" | "auth";
}) {
  const userId = mode === "app" ? await getCurrentUserId() : null;
  const [unreadNotifications, unreadDealMessages, unreadItemMessages, pendingSwaps] = userId
    ? await Promise.all([
        prisma.notification.count({ where: { userId, isRead: false } }).catch(() => 0),
        prisma.dealMessage.count({
          where: {
            senderId: { not: userId },
            isRead: false,
            swap: { OR: [{ senderId: userId }, { receiverId: userId }] },
          },
        }).catch(() => 0),
        prisma.itemThreadMessage.count({
          where: {
            senderId: { not: userId },
            isRead: false,
            thread: { OR: [{ buyerId: userId }, { ownerId: userId }] },
          },
        }).catch(() => 0),
        prisma.swapRequest
          .count({ where: { receiverId: userId, status: "PENDING" } })
          .catch(() => 0),
      ])
    : [0, 0, 0, 0];

  return (
    <RealtimeProvider enabled={Boolean(userId)}>
      <div className="relative min-h-screen overflow-x-clip">
        <a href="#main-content" className="skip-link">
          К содержимому
        </a>
        <div aria-hidden="true" className="dot-grid-bg pointer-events-none fixed inset-0 opacity-50" />
        <div aria-hidden="true" className="pointer-events-none fixed -left-40 -top-52 h-[34rem] w-[34rem] rounded-full bg-teal-400/[0.12] blur-[150px]" />
        <div aria-hidden="true" className="pointer-events-none fixed -right-48 top-10 h-[38rem] w-[38rem] rounded-full bg-blue-500/[0.12] blur-[160px]" />
        {mode === "app" ? (
          <NavigationWithPolling
            initialUnreadNotifications={unreadNotifications}
            initialUnreadMessages={unreadDealMessages + unreadItemMessages}
            initialPendingSwaps={pendingSwaps}
          />
        ) : null}
        <main id="main-content" className="relative z-10">{children}</main>
        {mode === "app" ? <SiteFooter /> : null}
      </div>
    </RealtimeProvider>
  );
}
