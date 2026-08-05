"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  MessageCircle,
  PackageCheck,
  Repeat2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AccountNavigationProps = {
  counts: {
    listings: number;
    messages: number;
    exchanges: number;
    favorites: number;
  };
};

const entries = [
  { href: "/profile", label: "Мои объявления", icon: PackageCheck, countKey: "listings" },
  { href: "/profile/chats", label: "Сообщения", icon: MessageCircle, countKey: "messages" },
  { href: "/profile/exchanges", label: "Обмены", icon: Repeat2, countKey: "exchanges" },
  { href: "/profile/favorites", label: "Избранное", icon: Heart, countKey: "favorites" },
  { href: "/profile/edit", label: "Профиль и настройки", icon: UserRound },
  { href: "/profile/safety", label: "Безопасность", icon: ShieldCheck },
] as const;

export function AccountNavigation({ counts }: AccountNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1" aria-label="Разделы личного кабинета">
      {entries.map((entry) => {
        const Icon = entry.icon;
        const active = entry.href === "/profile"
          ? pathname === "/profile"
          : pathname === entry.href || pathname.startsWith(`${entry.href}/`);
        const count = "countKey" in entry ? counts[entry.countKey] : 0;

        return (
          <Link
            key={entry.href}
            href={entry.href}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-[15px] px-3.5 text-sm transition-colors",
              active
                ? "bg-white/[0.08] text-white"
                : "text-white/52 hover:bg-white/[0.045] hover:text-white",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-teal-200" : "text-white/38")} />
            <span className="min-w-0 flex-1 truncate">{entry.label}</span>
            {count > 0 ? (
              <span className="rounded-full bg-teal-300/12 px-2 py-0.5 text-[10px] font-semibold text-teal-100/75">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
