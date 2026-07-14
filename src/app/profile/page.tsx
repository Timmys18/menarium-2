import Link from "next/link";
import Image from "next/image";
import { ItemStatus, SwapStatus } from "@prisma/client";
import { ArrowRightLeft, CheckCircle2, MessageCircle, Sparkles, Tag } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { loginHref } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { SignOutButton } from "./profile-actions";
import { EmailVerifyBanner } from "./email-verify-banner";
import { ExchangeActionPanel } from "@/app/exchange/exchange-controls";

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
        select: { id: true, email: true, name: true, city: true, image: true, createdAt: true, emailVerified: true },
      })
    : null;

  const [
    activeItems,
    activeSwaps,
    completedSwaps,
    dealChats,
    itemChats,
    incomingSwaps,
    outgoingSwaps,
    matchSwaps,
    recentIncoming,
    recentNotifications,
    recentChats,
  ] = userId
    ? await Promise.all([
        prisma.item.count({ where: { ownerId: userId, status: ItemStatus.ACTIVE } }),
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
          where: { OR: [{ senderId: userId }, { receiverId: userId }], messages: { some: {} } },
        }),
        prisma.itemThread.count({ where: { OR: [{ buyerId: userId }, { ownerId: userId }] } }),
        prisma.swapRequest.count({ where: { receiverId: userId, status: SwapStatus.PENDING } }),
        prisma.swapRequest.count({ where: { senderId: userId, status: SwapStatus.PENDING } }),
        prisma.swapRequest.count({
          where: {
            status: { in: [SwapStatus.ACCEPTED, SwapStatus.COMPLETED] },
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        }),
        prisma.swapRequest.findMany({
          where: { receiverId: userId, status: SwapStatus.PENDING },
          include: {
            sender: { select: { name: true } },
            senderItem: { select: { title: true } },
            receiverItem: { select: { title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        prisma.notification.findMany({
          where: { userId, isRead: false },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        prisma.itemThread.findMany({
          where: { OR: [{ buyerId: userId }, { ownerId: userId }] },
          include: {
            item: { select: { id: true, title: true } },
            buyer: { select: { name: true } },
            owner: { select: { name: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { updatedAt: "desc" },
          take: 3,
        }),
      ])
    : [0, 0, 0, 0, 0, 0, 0, 0, [], [], []];

  const isNewUser = user && activeItems === 0 && activeSwaps === 0;
  const onboardingSteps = user
    ? [
        { done: Boolean(user.name && user.city), label: "Заполнить профиль", href: "/profile/edit" },
        { done: activeItems > 0, label: "Создать первое объявление", href: "/new" },
        { done: outgoingSwaps > 0, label: "Предложить обмен", href: "/swipe" },
        { done: completedSwaps > 0, label: "Завершить первую сделку", href: "/exchange?tab=matches" },
      ]
    : [];

  const stats = [
    { label: "Активных объявлений", value: activeItems, icon: Tag, color: "text-teal-400", href: "/my-items" },
    { label: "Активных обменов", value: activeSwaps, icon: ArrowRightLeft, color: "text-purple-400", href: "/exchange?tab=matches" },
    { label: "Завершённых обменов", value: completedSwaps, icon: CheckCircle2, color: "text-green-400", href: "/exchange?tab=matches" },
    { label: "Чатов", value: dealChats + itemChats, icon: MessageCircle, color: "text-blue-400", href: "/profile/chats" },
  ];

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-28">
        <div className="mx-auto max-w-[1400px] space-y-6">
          {!user ? (
            <EmptyState
              title="Войдите в личный кабинет"
              description="Профиль Menarium — ваш центр обменов, объявлений, чатов и уведомлений."
              actionHref={loginHref("/profile")}
              actionLabel="Войти"
            />
          ) : (
            <>
              {!user.emailVerified ? <EmailVerifyBanner email={user.email} /> : null}
              <GlassCard className="rounded-3xl p-8">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name ?? "Аватар"}
                          width={80}
                          height={80}
                          className="h-20 w-20 rounded-2xl object-cover shadow-lg shadow-teal-500/20"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-purple-600 shadow-lg shadow-teal-500/20">
                          <span className="text-2xl font-bold">{getInitials(user.name, user.email)}</span>
                        </div>
                      )}
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
                    <MenariumLinkButton href="/profile/edit" variant="secondary">
                      Редактировать профиль
                    </MenariumLinkButton>
                    <SignOutButton />
                  </div>
                </div>
              </GlassCard>

              {isNewUser ? (
                <GlassCard className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-teal-400" />
                    <h2 className="text-xl font-semibold">Старт в Menarium</h2>
                  </div>
                  <p className="mb-5 text-sm text-white/55">Пройди короткий путь — и первый обмен будет близко.</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {onboardingSteps.map((step, index) => (
                      <Link
                        key={step.label}
                        href={step.href}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition hover:bg-white/[0.04] ${
                          step.done ? "border-teal-500/30 bg-teal-500/5" : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            step.done ? "bg-teal-500 text-white" : "bg-white/10 text-white/50"
                          }`}
                        >
                          {step.done ? "✓" : index + 1}
                        </span>
                        <span className={step.done ? "text-white/70 line-through" : "text-white"}>{step.label}</span>
                      </Link>
                    ))}
                  </div>
                </GlassCard>
              ) : null}

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {stats.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.label} href={item.href}>
                      <GlassCard className="glass-card-hover p-5 transition-transform hover:scale-[1.02]">
                        <Icon className={`mb-3 h-5 w-5 ${item.color}`} />
                        <div className="text-3xl font-semibold">{item.value}</div>
                        <p className="mt-1 text-xs text-white/40">{item.label}</p>
                      </GlassCard>
                    </Link>
                  );
                })}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                  <GlassCard className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl tracking-tight">Входящие предложения</h2>
                        <p className="text-xs text-white/35">Требуют вашего решения</p>
                      </div>
                      <MenariumLinkButton href="/exchange?tab=incoming" variant="ghost" size="sm">
                        Все ({incomingSwaps})
                      </MenariumLinkButton>
                    </div>
                    {recentIncoming.length > 0 ? (
                      <div className="space-y-3">
                        {recentIncoming.map((swap) => (
                          <div
                            key={swap.id}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                          >
                            <Link
                              href={`/exchange?tab=incoming&swap=${swap.id}`}
                              className="mb-3 flex items-center justify-between rounded-xl transition hover:text-teal-200"
                            >
                              <div>
                                <p className="font-medium">{swap.sender.name ?? "Пользователь"}</p>
                                <p className="text-sm text-white/45">
                                  {swap.senderItem.title} → {swap.receiverItem.title}
                                </p>
                              </div>
                              <Badge variant="teal">Подробнее</Badge>
                            </Link>
                            <ExchangeActionPanel
                              swapId={swap.id}
                              status={swap.status}
                              isSender={false}
                              isReceiver
                              senderCompleted={swap.senderCompleted}
                              receiverCompleted={swap.receiverCompleted}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/45">Новых предложений нет. Откройте свайп или каталог.</p>
                    )}
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl tracking-tight">Непрочитанное</h2>
                      <MenariumLinkButton href="/notifications" variant="ghost" size="sm">
                        Все уведомления
                      </MenariumLinkButton>
                    </div>
                    {recentNotifications.length > 0 ? (
                      <div className="space-y-3">
                        {recentNotifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.href ?? "/notifications"}
                            className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"
                          >
                            <p className="font-medium">{n.title}</p>
                            <p className="text-sm text-white/45">{n.message}</p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/45">Всё прочитано — отличная работа.</p>
                    )}
                  </GlassCard>
                </div>

                <div className="space-y-6">
                  <GlassCard className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl tracking-tight">Центр обменов</h2>
                      <MenariumLinkButton href="/exchange" variant="ghost" size="sm">
                        Открыть
                      </MenariumLinkButton>
                    </div>
                    <div className="grid gap-3">
                      {[
                        { title: "Вам предложили", count: incomingSwaps, href: "/exchange?tab=incoming" },
                        { title: "Вы предложили", count: outgoingSwaps, href: "/exchange?tab=outgoing" },
                        { title: "Матчи", count: matchSwaps, href: "/exchange?tab=matches" },
                      ].map((entry) => (
                        <Link
                          key={entry.title}
                          href={entry.href}
                          className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 transition hover:bg-white/[0.04]"
                        >
                          <span className="text-sm text-white/70">{entry.title}</span>
                          <span className="text-lg font-semibold">{entry.count}</span>
                        </Link>
                      ))}
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl tracking-tight">Последние чаты</h2>
                      <MenariumLinkButton href="/profile/chats" variant="ghost" size="sm">
                        Все
                      </MenariumLinkButton>
                    </div>
                    {recentChats.length > 0 ? (
                      <div className="space-y-3">
                        {recentChats.map((thread) => {
                          const partner = thread.buyerId === userId ? thread.owner : thread.buyer;
                          const preview = thread.messages[0]?.text ?? "Начните диалог";
                          return (
                            <Link
                              key={thread.id}
                              href={`/item/${thread.item.id}?thread=${thread.id}`}
                              className="block rounded-2xl border border-white/10 px-4 py-3 transition hover:bg-white/[0.04]"
                            >
                              <p className="font-medium">{partner.name ?? "Пользователь"}</p>
                              <p className="truncate text-sm text-white/45">{thread.item.title} · {preview}</p>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-white/45">Чатов пока нет.</p>
                    )}
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h2 className="mb-4 text-xl tracking-tight">Быстрые действия</h2>
                    <div className="space-y-3">
                      <MenariumLinkButton href="/new" className="w-full">
                        Создать объявление
                      </MenariumLinkButton>
                      <MenariumLinkButton href="/swipe" variant="secondary" className="w-full">
                        Свайп
                      </MenariumLinkButton>
                      <MenariumLinkButton href="/my-items" variant="secondary" className="w-full">
                        Мои объявления
                      </MenariumLinkButton>
                    </div>
                  </GlassCard>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
