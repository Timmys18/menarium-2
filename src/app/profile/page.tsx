import { SwapStatus } from "@prisma/client";
import { ArrowRightLeft, CheckCircle2, MessageCircle, Tag } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { SignOutButton } from "./profile-actions";

export const dynamic = "force-dynamic";

function getInitials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, city: true },
      })
    : null;
  const [activeItems, activeSwaps, completedSwaps, dealChats, itemChats, incomingSwaps, outgoingSwaps, matchSwaps] = userId
    ? await Promise.all([
        prisma.item.count({ where: { ownerId: userId, status: "ACTIVE" } }),
        prisma.swapRequest.count({
          where: {
            status: { in: [SwapStatus.PENDING, SwapStatus.ACCEPTED] },
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        }),
        prisma.swapRequest.count({
          where: {
            status: SwapStatus.COMPLETED,
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        }),
        prisma.swapRequest.count({
          where: {
            OR: [{ senderId: userId }, { receiverId: userId }],
            messages: { some: {} },
          },
        }),
        prisma.itemThread.count({
          where: { OR: [{ buyerId: userId }, { ownerId: userId }] },
        }),
        prisma.swapRequest.count({ where: { receiverId: userId, status: SwapStatus.PENDING } }),
        prisma.swapRequest.count({ where: { senderId: userId, status: SwapStatus.PENDING } }),
        prisma.swapRequest.count({
          where: {
            status: { in: [SwapStatus.ACCEPTED, SwapStatus.COMPLETED] },
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        }),
      ])
    : [0, 0, 0, 0, 0, 0, 0, 0];

  const stats = [
    { label: "Активных объявлений", value: activeItems, icon: Tag, color: "text-teal-400" },
    { label: "Активных обменов", value: activeSwaps, icon: ArrowRightLeft, color: "text-purple-400" },
    { label: "Завершенных обменов", value: completedSwaps, icon: CheckCircle2, color: "text-green-400" },
    { label: "Чатов", value: dealChats + itemChats, icon: MessageCircle, color: "text-blue-400" },
  ];

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-28">
        <div className="mx-auto max-w-[1400px] space-y-6">
          {!user ? (
            <EmptyState
              title="Войдите в личный кабинет"
              description="Профиль Menarium показывает ваши объявления, обмены, чаты и быстрые действия."
              actionHref="/auth/login"
              actionLabel="Войти"
            />
          ) : (
            <>
          <GlassCard className="rounded-3xl p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-purple-600 shadow-lg shadow-teal-500/20">
                    <span className="text-2xl font-bold">{getInitials(user.name, user.email)}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-[#0a0a0f] bg-teal-500" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/30">Личный кабинет</p>
                  <h1 className="mb-1 text-3xl tracking-tight">{user.name ?? "Menarium пользователь"}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                    <span>{user.email}</span>
                    <span>{user.city ?? "Город не указан"}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <MenariumLinkButton href="/profile/edit" variant="secondary">Редактировать профиль</MenariumLinkButton>
                <SignOutButton />
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((item) => {
              const Icon = item.icon;
              return (
                <GlassCard key={item.label} className="p-5">
                  <Icon className={`mb-3 h-5 w-5 ${item.color}`} />
                  <div className="text-3xl font-semibold">{item.value}</div>
                  <p className="mt-1 text-xs text-white/40">{item.label}</p>
                </GlassCard>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <GlassCard className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl tracking-tight">Центр обменов</h2>
                  <p className="text-xs text-white/35">Последние предложения и матчи</p>
                </div>
                <MenariumLinkButton href="/exchange" variant="ghost" size="sm">Полный режим</MenariumLinkButton>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { title: "Вам предложили", count: incomingSwaps, href: "/exchange?tab=incoming" },
                  { title: "Вы предложили", count: outgoingSwaps, href: "/exchange?tab=outgoing" },
                  { title: "Матчи", count: matchSwaps, href: "/exchange?tab=matches" },
                ].map((entry) => (
                  <GlassCard key={entry.title} className="p-5">
                    <h3 className="mb-2 font-semibold">{entry.title}</h3>
                    <p className="mb-4 text-3xl font-semibold">{entry.count}</p>
                    <MenariumLinkButton href={entry.href} variant="ghost" size="sm">
                      Открыть
                    </MenariumLinkButton>
                  </GlassCard>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="mb-4 text-xl tracking-tight">Быстрые действия</h2>
              <div className="space-y-3">
                <MenariumLinkButton href="/new" className="w-full">Создать объявление</MenariumLinkButton>
                <MenariumLinkButton href="/my-items" variant="secondary" className="w-full">Мои объявления</MenariumLinkButton>
                <MenariumLinkButton href="/exchange" variant="secondary" className="w-full">Центр обменов</MenariumLinkButton>
                <MenariumLinkButton href="/notifications" variant="secondary" className="w-full">Уведомления</MenariumLinkButton>
                <MenariumLinkButton href="/profile/chats" variant="secondary" className="w-full">Мои чаты</MenariumLinkButton>
              </div>
            </GlassCard>
          </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
