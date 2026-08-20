"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Compass, MessageCircle, Plus, Repeat2, Sparkles, UserRound } from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/menarium/brand";
import { cn } from "@/lib/utils";

const primaryItems = [
  { href: "/catalog", label: "Каталог", icon: Compass, primary: false },
  { href: "/swipe", label: "Свайп", icon: Sparkles, primary: false },
  { href: "/exchange", label: "Обмены", icon: Repeat2, primary: false },
  { href: "/profile/chats", label: "Сообщения", icon: MessageCircle, primary: false },
];

const mobileItems = [
  primaryItems[0],
  primaryItems[1],
  { href: "/new", label: "Создать", icon: Plus, primary: true },
  primaryItems[2],
  { ...primaryItems[3], label: "Чаты" },
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
        "flex items-center justify-center rounded-full bg-amber-300 font-bold text-on-accent shadow-[0_0_18px_rgba(255,188,114,0.3)]",
        compact
          ? "absolute -right-1 -top-1 h-4 min-w-4 px-1 text-micro leading-none"
          : "min-w-5 px-1.5 py-0.5 text-micro",
      )}
      aria-label={`${count} новых`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function Navigation({
  unreadNotifications = 0,
  unreadMessages = 0,
  pendingSwaps = 0,
}: {
  unreadNotifications?: number;
  unreadMessages?: number;
  pendingSwaps?: number;
}) {
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Основная навигация" className="desktop-navigation fixed inset-x-0 top-0 z-50 hidden md:block">
        <div className="mx-auto max-w-shell px-4 py-3 lg:px-6">
          <div className="app-chrome rounded-card px-3 py-2.5">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                aria-label="Менариум — главная"
                aria-current={pathname === "/" ? "page" : undefined}
                className="desktop-brand group flex min-h-11 items-center rounded-control px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <BrandLockup
                  priority
                  markClassName="transition duration-[var(--duration-slow)] group-hover:scale-[1.04]"
                  textClassName="lg:text-2xl"
                />
              </Link>

              <div className="flex items-center gap-1 rounded-control border border-line-hairline bg-black/10 p-1">
                {primaryItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  const count = item.href === "/exchange" ? pendingSwaps : item.href === "/profile/chats" ? unreadMessages : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "desktop-nav-link relative flex min-h-11 items-center gap-2 rounded-control px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] lg:px-5",
                        active
                          ? "border border-line-default bg-fill-3 text-text-primary shadow-inner shadow-white/[0.03]"
                          : "border border-transparent text-text-subtle hover:bg-fill-2 hover:text-text-primary",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-text-subtle")} />
                      {item.label}
                      <CountBadge count={count} />
                    </Link>
                  );
                })}
              </div>

              <div className="desktop-actions flex items-center gap-2">
                <Link
                  href="/new"
                  aria-label="Добавить объявление"
                  aria-current={isActivePath(pathname, "/new") ? "page" : undefined}
                  className="inline-flex min-h-11 items-center gap-2 rounded-control border border-blue-300/20 bg-gradient-to-r from-blue-500 to-teal-400 px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(77,141,255,0.2)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] lg:px-5"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden lg:inline">Добавить</span>
                </Link>
                <Link
                  href="/notifications"
                  aria-label="Уведомления"
                  aria-current={isActivePath(pathname, "/notifications") ? "page" : undefined}
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center rounded-control border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                    isActivePath(pathname, "/notifications")
                      ? "border-line-default bg-fill-3 text-text-primary"
                      : "border-line-hairline bg-fill-1 text-text-subtle hover:bg-fill-3 hover:text-text-primary",
                  )}
                >
                  <Bell className="h-4.5 w-4.5" />
                  <CountBadge count={unreadNotifications} compact />
                </Link>
                <Link
                  href="/profile"
                  aria-label="Профиль"
                  aria-current={isActivePath(pathname, "/profile") ? "page" : undefined}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-control border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                    isActivePath(pathname, "/profile")
                      ? "border-teal-300/25 bg-teal-300/10 text-accent"
                      : "border-line-hairline bg-fill-1 text-text-subtle hover:bg-fill-3 hover:text-text-primary",
                  )}
                >
                  <UserRound className="h-4.5 w-4.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <header className="mobile-navigation fixed inset-x-0 top-0 z-50 px-3 pt-3 md:hidden">
        <div className="app-chrome mx-auto flex max-w-lg items-center justify-between rounded-card px-3 py-2">
          <Link
            href="/"
            aria-label="Менариум — главная"
            aria-current={pathname === "/" ? "page" : undefined}
            className="flex min-h-11 items-center rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <BrandLockup
              priority
              markClassName="h-9 w-9"
              textClassName="text-lg"
            />
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/notifications"
              aria-label="Уведомления"
              aria-current={isActivePath(pathname, "/notifications") ? "page" : undefined}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-xs border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                isActivePath(pathname, "/notifications")
                  ? "border-teal-300/25 bg-teal-300/10 text-accent"
                  : "border-line-hairline bg-fill-1 text-text-subtle",
              )}
            >
              <Bell className="h-4.5 w-4.5" />
              <CountBadge count={unreadNotifications} compact />
            </Link>
            <Link
              href="/profile"
              aria-label="Личный кабинет"
              aria-current={isActivePath(pathname, "/profile") ? "page" : undefined}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xs border transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                isActivePath(pathname, "/profile")
                  ? "border-teal-300/25 bg-teal-300/10 text-accent"
                  : "border-line-hairline bg-fill-1 text-text-subtle",
              )}
            >
              <UserRound className="h-4.5 w-4.5" />
            </Link>
          </div>
        </div>
      </header>

      <nav aria-label="Мобильная навигация" className="mobile-navigation fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="mobile-navigation-bottom-inset px-2.5 pt-5">
          <div className="app-chrome mx-auto max-w-lg rounded-card px-1.5 py-1.5">
            <div className="grid grid-cols-5 items-stretch gap-0.5">
              {mobileItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                const count = item.href === "/exchange" ? pendingSwaps : item.href === "/profile/chats" ? unreadMessages : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative grid min-h-[60px] min-w-0 grid-rows-[32px_auto] items-center justify-items-center gap-0.5 rounded-control px-0.5 py-1 text-micro font-medium leading-none transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                      active && !item.primary ? "bg-fill-2 text-text-primary" : "text-text-subtle",
                      item.primary && "text-text-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex items-center justify-center transition",
                        item.primary
                          ? "h-8 w-10 rounded-xs text-text-primary"
                          : active
                            ? "h-8 w-10 rounded-xs bg-fill-4 text-accent"
                            : "h-8 w-10 rounded-xs text-text-subtle",
                      )}
                    >
                      {item.primary ? (
                        <BrandMark size="xs" className="h-6 w-6" decorative />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                      <CountBadge count={count} compact />
                    </span>
                    <span className={cn("whitespace-nowrap", active && "font-semibold text-text-primary")}>{item.label}</span>
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
