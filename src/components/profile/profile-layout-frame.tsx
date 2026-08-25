"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronDown, Menu } from "lucide-react";
import { SurfaceCard } from "@/components/menarium/card";
import { AccountNavigation } from "@/components/profile/account-navigation";

type AccountCounts = {
  listings: number;
  messages: number;
  exchanges: number;
  favorites: number;
};

function sectionMeta(pathname: string) {
  if (pathname.startsWith("/profile/chats/item/")) {
    return { title: "Диалог", backHref: "/profile/chats", backLabel: "К сообщениям" };
  }
  if (pathname.startsWith("/profile/chats")) {
    return { title: "Сообщения", backHref: "/profile", backLabel: "В кабинет" };
  }
  if (pathname.startsWith("/profile/favorites")) {
    return { title: "Избранное", backHref: "/profile", backLabel: "В кабинет" };
  }
  if (pathname.startsWith("/profile/edit")) {
    return { title: "Профиль", backHref: "/profile", backLabel: "В кабинет" };
  }
  if (pathname.startsWith("/profile/safety")) {
    return { title: "Безопасность", backHref: "/profile", backLabel: "В кабинет" };
  }
  return { title: "Личный кабинет", backHref: "/profile", backLabel: "В кабинет" };
}

export function ProfileLayoutFrame({
  children,
  profileCard,
  counts,
  hasUser,
}: {
  children: React.ReactNode;
  profileCard: React.ReactNode;
  counts: AccountCounts;
  hasUser: boolean;
}) {
  const pathname = usePathname();
  const compact = pathname !== "/profile";
  const section = sectionMeta(pathname);

  return (
    <div className="min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
      <div className="mx-auto max-w-[1360px]">
        {!compact ? profileCard : null}

        <div className={hasUser ? "grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]" : ""}>
          {hasUser ? (
            <SurfaceCard className="hidden p-2 lg:sticky lg:top-28 lg:block">
              <AccountNavigation counts={counts} />
            </SurfaceCard>
          ) : null}

          <div className="min-w-0">
            {hasUser && compact ? (
              <SurfaceCard className="relative z-20 mb-3 overflow-visible p-1.5 lg:hidden">
                <div className="flex min-h-11 items-center gap-1">
                  <Link
                    href={section.backHref}
                    aria-label={section.backLabel}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white/78 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </Link>
                  <span className="min-w-0 flex-1 truncate px-2 text-sm font-semibold text-white/90">
                    {section.title}
                  </span>
                  <details className="group relative">
                    <summary
                      aria-label="Открыть разделы кабинета"
                      className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-[14px] text-white/78 marker:hidden transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
                    >
                      <Menu className="h-4.5 w-4.5 group-open:hidden" />
                      <ChevronDown className="hidden h-4.5 w-4.5 group-open:block" />
                    </summary>
                    <SurfaceCard className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(19rem,calc(100vw-2rem))] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
                      <AccountNavigation counts={counts} />
                    </SurfaceCard>
                  </details>
                </div>
              </SurfaceCard>
            ) : null}

            {hasUser && !compact ? (
              <SurfaceCard className="mb-4 p-2 lg:hidden">
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold text-white marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300/65">
                    Разделы кабинета
                    <ChevronDown className="h-4 w-4 text-white/78 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-white/8 pt-2">
                    <AccountNavigation counts={counts} />
                  </div>
                </details>
              </SurfaceCard>
            ) : null}

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
