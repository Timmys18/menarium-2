"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { RealtimeProvider } from "@/components/hooks/use-realtime";
import { NavigationWithPolling } from "@/components/layout/navigation-with-polling";
import { SiteFooter } from "@/components/layout/site-footer";

function isAuthRoute(pathname: string | null) {
  return pathname?.startsWith("/auth/") ?? false;
}

export function ApplicationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const showApplicationChrome = !isAuthRoute(pathname);
  const authenticated = status === "authenticated";

  return (
    <RealtimeProvider enabled={showApplicationChrome && authenticated}>
      <div id="menarium-app" className="relative min-h-screen overflow-x-clip">
        <a href="#main-content" className="skip-link">
          К содержимому
        </a>
        {showApplicationChrome ? (
          <NavigationWithPolling
            enabled={authenticated}
            initialUnreadNotifications={0}
            initialUnreadMessages={0}
            initialPendingSwaps={0}
          />
        ) : null}
        <main id="main-content" className="relative z-10">{children}</main>
        {showApplicationChrome ? <SiteFooter /> : null}
      </div>
    </RealtimeProvider>
  );
}
