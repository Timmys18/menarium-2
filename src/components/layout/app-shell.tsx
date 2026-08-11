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
      <div id="menarium-app" className="relative min-h-screen overflow-x-clip">
        <a href="#main-content" className="skip-link">
          К содержимому
        </a>
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
