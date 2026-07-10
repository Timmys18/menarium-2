"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Grid3X3, Home, PlusCircle, Repeat, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/swipe", label: "Свайп", icon: Repeat },
  { href: "/new", label: "Создать", icon: PlusCircle },
  { href: "/exchange", label: "Обмены", icon: Grid3X3 },
  { href: "/profile", label: "Профиль", icon: User },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
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
      <nav className="fixed left-0 right-0 top-0 z-50 hidden md:block">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="glass-card rounded-3xl px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="glow-purple flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-purple-500">
                  <Repeat className="h-6 w-6 text-white" />
                </div>
                <span className="gradient-text font-display text-2xl font-bold tracking-tight">MENARIUM</span>
              </Link>

              <div className="flex items-center gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  const showPending = item.href === "/exchange" && pendingSwaps > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative rounded-2xl px-5 py-3 transition-all hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60",
                        active
                          ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Icon className="h-5 w-5" />
                        {item.label}
                        {showPending ? (
                          <span className="min-w-5 rounded-full bg-purple-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                            {pendingSwaps > 9 ? "9+" : pendingSwaps}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/catalog"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
                  aria-label="Поиск и каталог"
                >
                  <Search className="h-5 w-5" />
                </Link>
                <Link
                  href="/notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
                  aria-label="Уведомления"
                >
                  <Bell className="h-5 w-5" />
                  {inboxBadge > 0 ? (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-purple-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                      {inboxBadge > 9 ? "9+" : inboxBadge}
                    </span>
                  ) : null}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="px-4 pb-6">
          <div className="glass-card rounded-3xl px-4 py-3">
            <div className="flex items-center justify-around">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                const showPending = item.href === "/exchange" && pendingSwaps > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative rounded-2xl p-3 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60",
                      active
                        ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                        : "text-white/60",
                    )}
                    aria-label={item.label}
                  >
                    <Icon className="h-6 w-6" />
                    {showPending ? (
                      <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-purple-500" />
                    ) : null}
                  </Link>
                );
              })}
              <Link
                href="/notifications"
                className={cn(
                  "relative rounded-2xl p-3 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60",
                  isActivePath(pathname, "/notifications")
                    ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                    : "text-white/60",
                )}
                aria-label="Уведомления"
              >
                <Bell className="h-6 w-6" />
                {inboxBadge > 0 ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-purple-500" /> : null}
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
