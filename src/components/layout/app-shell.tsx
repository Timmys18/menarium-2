import type { ReactNode } from "react";
import { RealtimeProvider } from "@/components/hooks/use-realtime";
import { NavigationWithPolling } from "@/components/layout/navigation-with-polling";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCurrentUserId } from "@/server/session";

export async function AppShell({
  children,
  mode = "app",
}: {
  children: ReactNode;
  mode?: "app" | "auth";
}) {
  const userId = mode === "app" ? await getCurrentUserId() : null;
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
            initialUnreadNotifications={0}
            initialUnreadMessages={0}
            initialPendingSwaps={0}
          />
        ) : null}
        <main id="main-content" className="relative z-10">{children}</main>
        {mode === "app" ? <SiteFooter /> : null}
      </div>
    </RealtimeProvider>
  );
}
