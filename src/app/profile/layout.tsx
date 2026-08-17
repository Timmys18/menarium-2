import Image from "next/image";
import { ItemStatus, SwapStatus } from "@prisma/client";
import { CheckCircle2, ChevronDown, MapPin, Settings } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard, SurfaceCard } from "@/components/menarium/card";
import { AccountNavigation } from "@/components/profile/account-navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { SignOutButton } from "./profile-actions";

export const dynamic = "force-dynamic";

function getInitials(name: string | null, email: string) {
  return (name?.trim() || email)
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          city: true,
          image: true,
          createdAt: true,
          emailVerified: true,
        },
      })
    : null;

  const [listings, favorites, exchanges, unreadDealMessages, unreadItemMessages] = userId
    ? await Promise.all([
        prisma.item.count({ where: { ownerId: userId, status: ItemStatus.ACTIVE } }),
        prisma.favorite.count({ where: { userId } }),
        prisma.swapRequest.count({
          where: {
            status: { in: [SwapStatus.PENDING, SwapStatus.ACCEPTED] },
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        }),
        prisma.dealMessage.count({
          where: {
            senderId: { not: userId },
            isRead: false,
            swap: { OR: [{ senderId: userId }, { receiverId: userId }] },
          },
        }),
        prisma.itemThreadMessage.count({
          where: {
            senderId: { not: userId },
            isRead: false,
            thread: { OR: [{ buyerId: userId }, { ownerId: userId }] },
          },
        }),
      ])
    : [0, 0, 0, 0, 0];
  const accountCounts = {
    listings,
    messages: unreadDealMessages + unreadItemMessages,
    exchanges,
    favorites,
  };

  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-28">
        <div className="mx-auto max-w-[1360px]">
          {user ? (
            <GlassCard className="mb-5 overflow-hidden border border-white/8 p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name ?? "Аватар"}
                      width={64}
                      height={64}
                      className="h-14 w-14 shrink-0 rounded-[18px] object-cover sm:h-16 sm:w-16"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-blue-500 to-teal-400 text-lg font-bold sm:h-16 sm:w-16">
                      {getInitials(user.name, user.email)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="type-kicker text-white/62">Личный кабинет</p>
                    <h1 className="type-page-title mt-1 truncate text-2xl sm:text-3xl">
                      {user.name ?? "Участник Менариум"}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/78">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {user.city ?? "Город не указан"}
                      </span>
                      <span>С нами с {new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(user.createdAt)}</span>
                      {user.emailVerified ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-teal-200/70"
                          aria-label="Статус почты: подтверждена"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Почта подтверждена
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MenariumLinkButton href={`/user/${user.id}`} prefetch={false} variant="secondary" size="sm">
                    Моя страница
                  </MenariumLinkButton>
                  <MenariumLinkButton href="/profile/edit" variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                    Настройки
                  </MenariumLinkButton>
                  <SignOutButton />
                </div>
              </div>
            </GlassCard>
          ) : null}

          <div className={user ? "grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]" : ""}>
            {user ? (
              <SurfaceCard className="hidden p-2 lg:sticky lg:top-28 lg:block">
                <AccountNavigation counts={accountCounts} />
              </SurfaceCard>
            ) : null}
            <div className="min-w-0">
              {user ? (
                <SurfaceCard className="mb-4 p-2 lg:hidden">
                  <details className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold text-white marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300/65">
                      Разделы профиля
                      <ChevronDown className="h-4 w-4 text-white/78 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-white/8 pt-2">
                      <AccountNavigation counts={accountCounts} />
                    </div>
                  </details>
                </SurfaceCard>
              ) : null}
              {children}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
