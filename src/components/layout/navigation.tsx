"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Bell, Compass, Plus, Repeat2, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const desktopItems = [
  { href: "/catalog", label: "Каталог", icon: Compass },
  { href: "/swipe", label: "Свайп", icon: Repeat2 },
  { href: "/exchange", label: "Обмены", icon: ArrowLeftRight },
];

const mobileItems = [
  { href: "/catalog", label: "Каталог", icon: Search },
  { href: "/swipe", label: "Свайп", icon: Repeat2 },
  { href: "/new", label: "Создать", icon: Plus, primary: true },
  { href: "/exchange", label: "Обмены", icon: ArrowLeftRight },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/catalog") return pathname === "/catalog" || pathname.startsWith("/item/");
  if (href === "/profile") {
    return pathname === "/profile" || pathname.startsWith("/profile/") || pathname === "/my-items";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CountBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-amber-300 font-bold text-[#151008] shadow-[0_0_18px_rgba(255,188,114,0.3)]",
        compact ? "absolute right-1 top-0.5 h-2.5 w-2.5" : "min-w-5 px-1.5 py-0.5 text-[10px]",
      )}
      aria-label={`${count} новых`}
    >
      {compact ? null : count > 9 ? "9+" : count}
    </span>
  );
}

export function Navigation({
  unreadCount = 0,
  pendingSwaps = 0,
}: {
  unreadCount?: number;
  pendingSwaps?: number;
}) {
  const pathname = usePathname();
  const inboxBadge = unreadCount + pendingSwaps;

  return (
    <>
      <nav aria-label="Основная навигация" className="fixed inset-x-0 top-0 z-50 hidden md:block">
        <div className="mx-auto max-w-[1480px] px-4 py-3 lg:px-6">
          <div className="glass-card rounded-[24px] px-3 py-2.5">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                aria-label="Menarium — главная"
                aria-current={pathname === "/" ? "page" : undefined}
                className="group flex items-center gap-2.5 rounded-2xl px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/15 bg-gradient-to-br from-blue-500 to-teal-400 shadow-[0_10px_28px_rgba(77,141,255,0.25)] transition group-hover:rotate-3">
                  <Repeat2 className="h-5 w-5 text-white" />
                </span>
                <span className="gradient-text font-display text-xl font-bold tracking-[-0.03em] lg:text-2xl">
                  MENARIUM
                </span>
              </Link>

              <div className="flex items-center gap-1 rounded-2xl border border-white/[0.06] bg-black/10 p-1">
                {desktopItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  const count = item.href === "/exchange" ? pendingSwaps : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-11 items-center gap-2 rounded-[14px] px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 lg:px-5",
                        active
                          ? "border border-white/10 bg-white/[0.09] text-white shadow-inner shadow-white/[0.03]"
                          : "border border-transparent text-white/52 hover:bg-white/[0.045] hover:text-white",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-teal-300" : "text-white/42")} />
                      {item.label}
                      <CountBadge count={count} />
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/new"
                  aria-current={isActivePath(pathname, "/new") ? "page" : undefined}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-blue-300/20 bg-gradient-to-r from-blue-500 to-teal-400 px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(77,141,255,0.2)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80 lg:px-5"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden lg:inline">Добавить</span>
                </Link>
                <Link
                  href="/notifications"
                  aria-label="Уведомления"
                  aria-current={isActivePath(pathname, "/notifications") ? "page" : undefined}
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center rounded-[14px] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70",
                    isActivePath(pathname, "/notifications")
                      ? "border-white/14 bg-white/[0.09] text-white"
                      : "border-white/[0.07] bg-white/[0.035] text-white/50 hover:bg-white/[0.07] hover:text-white",
                  )}
                >
                  <Bell className="h-4.5 w-4.5" />
                  <CountBadge count={inboxBadge} compact />
                </Link>
                <Link
                  href="/profile"
                  aria-label="Профиль"
                  aria-current={isActivePath(pathname, "/profile") ? "page" : undefined}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-[14px] border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70",
                    isActivePath(pathname, "/profile")
                      ? "border-teal-300/25 bg-teal-300/10 text-teal-200"
                      : "border-white/[0.07] bg-white/[0.035] text-white/50 hover:bg-white/[0.07] hover:text-white",
                  )}
                >
                  <UserRound className="h-4.5 w-4.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between rounded-[20px] border border-white/10 bg-[#0a0e16]/90 px-3 py-2 shadow-[0_14px_44px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <Link
            href="/"
            aria-label="Menarium — главная"
            aria-current={pathname === "/" ? "page" : undefined}
            className="flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 shadow-[0_8px_20px_rgba(77,141,255,0.22)]">
              <Repeat2 className="h-4.5 w-4.5" />
            </span>
            <span className="gradient-text font-display text-lg font-bold tracking-[-0.03em]">MENARIUM</span>
          </Link>
          <Link
            href="/notifications"
            aria-label="Уведомления"
            aria-current={isActivePath(pathname, "/notifications") ? "page" : undefined}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70",
              isActivePath(pathname, "/notifications")
                ? "border-teal-300/25 bg-teal-300/10 text-teal-200"
                : "border-white/[0.08] bg-white/[0.04] text-white/58",
            )}
          >
            <Bell className="h-4.5 w-4.5" />
            <CountBadge count={inboxBadge} compact />
          </Link>
        </div>
      </header>

      <nav aria-label="Мобильная навигация" className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div
          className="px-3 pt-2"
          style={{ paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-lg rounded-[24px] border border-white/12 bg-[#090d14]/92 px-1.5 py-1.5 shadow-[0_-12px_50px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
            <div className="grid grid-cols-5 gap-0.5">
              {mobileItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                const count = item.href === "/exchange" ? pendingSwaps : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-0.5 py-1.5 text-[9px] font-medium leading-none transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 min-[360px]:text-[10px]",
                      active ? "text-white" : "text-white/48",
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex h-8 w-10 items-center justify-center rounded-xl transition",
                        item.primary
                          ? "bg-gradient-to-br from-blue-500 to-teal-400 text-white shadow-[0_8px_22px_rgba(77,141,255,0.25)]"
                          : active
                            ? "bg-white/[0.1] text-teal-200"
                            : "text-white/48",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <CountBadge count={count} compact />
                    </span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
