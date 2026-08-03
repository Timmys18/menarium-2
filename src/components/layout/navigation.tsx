"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Compass, Heart, Plus, Repeat2, Search, UserRound } from "lucide-react";
import { BrandLockup } from "@/components/menarium/brand";
import { cn } from "@/lib/utils";

const desktopItems = [
  { href: "/catalog", label: "Каталог", icon: Compass },
  { href: "/favorites", label: "Избранное", icon: Heart },
  { href: "/swipe", label: "Свайп", icon: Repeat2 },
  { href: "/exchange", label: "Обмены", icon: Repeat2 },
];

const mobileItems = [
  { href: "/catalog", label: "Каталог", icon: Search },
  { href: "/swipe", label: "Свайп", icon: Repeat2 },
  { href: "/new", label: "Создать", icon: Plus, primary: true },
  { href: "/exchange", label: "Обмены", icon: Repeat2 },
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
        compact
          ? "absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[9px] leading-none"
          : "min-w-5 px-1.5 py-0.5 text-[10px]",
      )}
      aria-label={`${count} новых`}
    >
      {count > 9 ? "9+" : count}
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
  const inboxBadge = unreadCount;

  return (
    <>
      <nav aria-label="Основная навигация" className="fixed inset-x-0 top-0 z-50 hidden md:block">
        <div className="mx-auto max-w-[1480px] px-4 py-3 lg:px-6">
          <div className="surface-card rounded-[24px] px-3 py-2.5">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                aria-label="Менариум — главная"
                aria-current={pathname === "/" ? "page" : undefined}
                className="group rounded-2xl px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
              >
                <BrandLockup
                  priority
                  markClassName="transition duration-300 group-hover:scale-[1.04]"
                  textClassName="lg:text-2xl"
                />
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
                          : "border border-transparent text-white/58 hover:bg-white/[0.055] hover:text-white",
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
        <div className="mx-auto flex max-w-lg items-center justify-between rounded-[20px] border border-white/10 bg-[#090d14]/82 px-3 py-2 shadow-[0_14px_44px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
          <Link
            href="/"
            aria-label="Менариум — главная"
            aria-current={pathname === "/" ? "page" : undefined}
            className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
          >
            <BrandLockup
              priority
              markClassName="h-9 w-9 rounded-xl"
              textClassName="text-lg"
            />
          </Link>
          <Link
            href="/notifications"
            aria-label="Уведомления"
            aria-current={isActivePath(pathname, "/notifications") ? "page" : undefined}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70",
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
          className="px-2.5 pt-5"
          style={{ paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-lg rounded-[24px] border border-white/12 bg-[#080c13]/90 px-1.5 py-1.5 shadow-[0_-14px_54px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
            <div className="grid grid-cols-5 items-end gap-0.5">
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
                      "relative flex min-h-[54px] min-w-0 flex-col items-center justify-end gap-1 rounded-[18px] px-0.5 pb-1.5 text-[11px] font-medium leading-none transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70",
                      active && !item.primary ? "bg-white/[0.06] text-white" : "text-white/62",
                      item.primary && "text-white/86",
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex items-center justify-center transition",
                        item.primary
                          ? "-mt-5 h-12 w-12 rounded-[17px] border border-white/20 bg-gradient-to-br from-blue-500 to-teal-400 text-white shadow-[0_12px_30px_rgba(77,141,255,0.34)] ring-4 ring-[#080c13]"
                          : active
                            ? "h-8 w-10 rounded-xl bg-white/[0.1] text-teal-200"
                            : "h-8 w-10 rounded-xl text-white/62",
                      )}
                    >
                      <Icon className={item.primary ? "h-5 w-5" : "h-5 w-5"} />
                      <CountBadge count={count} compact />
                    </span>
                    <span className={cn("whitespace-nowrap", active && "font-semibold text-white")}>{item.label}</span>
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
