import Image from "next/image";
import Link from "next/link";
import { ItemStatus, ReportStatus, SwapStatus, UserStatus } from "@prisma/client";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  CirclePause,
  Clock3,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  PackageCheck,
  Repeat2,
  ShieldCheck,
} from "lucide-react";
import { ExchangeActionPanel } from "@/app/exchange/exchange-controls";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { buildProfileActivation } from "@/features/profile/activation";
import { expirePendingSwapOffers } from "@/features/exchange/expiration";
import { getSafeNotificationHref } from "@/features/notifications/href";
import { prisma } from "@/lib/prisma";
import { cn, loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { ActivationPanel } from "./activation-panel";
import { EmailVerifyBanner } from "./email-verify-banner";
import { SignOutButton } from "./profile-actions";
import { ProfileNotice } from "./profile-notice";

export const dynamic = "force-dynamic";

const DEAL_CHAT_STATUSES: SwapStatus[] = [
  SwapStatus.ACCEPTED,
  SwapStatus.COMPLETED,
  SwapStatus.CANCELLED,
];

function getInitials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatChatTime(value: Date) {
  const now = new Date();
  const sameDay =
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate();
  return sameDay
    ? value.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : value.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function exchangeChatHref({
  id,
  status,
  isSender,
}: {
  id: string;
  status: SwapStatus;
  isSender: boolean;
}) {
  if (status === SwapStatus.ACCEPTED) {
    return `/exchange?tab=matches&swap=${encodeURIComponent(id)}`;
  }
  if (status === SwapStatus.COMPLETED) {
    return `/exchange?tab=matches&filter=history&swap=${encodeURIComponent(id)}`;
  }
  return `/exchange?tab=${isSender ? "outgoing" : "incoming"}&filter=history&swap=${encodeURIComponent(id)}`;
}

type ProfilePageProps = {
  searchParams: Promise<{ welcome?: string; emailSent?: string; verified?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const userId = await getCurrentUserId();
  if (userId) await expirePendingSwapOffers(prisma, { userId });
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

  const [
    itemGroups,
    favoriteCount,
    incomingPending,
    outgoingPending,
    sentProposals,
    acceptedSwaps,
    completedSwaps,
    activeSafetyReports,
    unreadNotifications,
    unreadDealMessages,
    unreadItemMessages,
    recentIncoming,
    recentAccepted,
    recentNotifications,
    recentDealChats,
    recentItemChats,
  ] = userId
    ? await Promise.all([
        prisma.item.groupBy({
          by: ["status"],
          where: { ownerId: userId },
          _count: { _all: true },
        }),
        prisma.favorite.count({
          where: {
            userId,
            item: { status: ItemStatus.ACTIVE, owner: { status: UserStatus.ACTIVE } },
          },
        }),
        prisma.swapRequest.count({
          where: { receiverId: userId, status: SwapStatus.PENDING },
        }),
        prisma.swapRequest.count({
          where: { senderId: userId, status: SwapStatus.PENDING },
        }),
        prisma.swapRequest.count({ where: { senderId: userId } }),
        prisma.swapRequest.count({
          where: {
            status: SwapStatus.ACCEPTED,
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        }),
        prisma.swapRequest.count({
          where: {
            status: SwapStatus.COMPLETED,
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
        }),
        prisma.report.count({
          where: {
            reporterId: userId,
            status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] },
          },
        }),
        prisma.notification.count({ where: { userId, isRead: false } }),
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
        prisma.swapRequest.findMany({
          where: { receiverId: userId, status: SwapStatus.PENDING },
          include: {
            sender: { select: { name: true } },
            senderItem: { select: { title: true } },
            receiverItem: { select: { title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 2,
        }),
        prisma.swapRequest.findMany({
          where: {
            status: SwapStatus.ACCEPTED,
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
          include: {
            sender: { select: { name: true } },
            receiver: { select: { name: true } },
            senderItem: { select: { title: true } },
            receiverItem: { select: { title: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 2,
        }),
        prisma.notification.findMany({
          where: { userId, isRead: false },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        prisma.swapRequest.findMany({
          where: {
            status: { in: DEAL_CHAT_STATUSES },
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
          include: {
            sender: { select: { name: true } },
            receiver: { select: { name: true } },
            senderItem: { select: { title: true } },
            receiverItem: { select: { title: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
            _count: {
              select: {
                messages: { where: { senderId: { not: userId }, isRead: false } },
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 4,
        }),
        prisma.itemThread.findMany({
          where: { OR: [{ buyerId: userId }, { ownerId: userId }] },
          include: {
            item: { select: { id: true, title: true } },
            buyer: { select: { name: true } },
            owner: { select: { name: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
            _count: {
              select: {
                messages: { where: { senderId: { not: userId }, isRead: false } },
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 4,
        }),
      ])
    : [[], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, [], [], [], [], []];

  const itemCounts: Record<ItemStatus, number> = {
    [ItemStatus.ACTIVE]: 0,
    [ItemStatus.PAUSED]: 0,
    [ItemStatus.IN_DEAL]: 0,
    [ItemStatus.ARCHIVED]: 0,
  };
  for (const entry of itemGroups) itemCounts[entry.status] = entry._count._all;

  const activeItems = itemCounts[ItemStatus.ACTIVE];
  const pausedItems = itemCounts[ItemStatus.PAUSED];
  const inDealItems = itemCounts[ItemStatus.IN_DEAL];
  const archivedItems = itemCounts[ItemStatus.ARCHIVED];
  const unreadMessages = unreadDealMessages + unreadItemMessages;
  const activeSwaps = incomingPending + outgoingPending + acceptedSwaps;

  const activation = user
    ? buildProfileActivation({
        emailVerified: Boolean(user.emailVerified),
        hasProfileBasics: Boolean(user.name?.trim() && user.city?.trim()),
        activeItems,
        pausedItems,
        sentProposals,
        outgoingPending,
        completedSwaps,
        incomingPending,
        acceptedSwaps,
      })
    : null;

  const chats = [
    ...recentDealChats.map((swap) => {
      const isSender = swap.senderId === userId;
      const partner = isSender ? swap.receiver : swap.sender;
      const contextItem = isSender ? swap.receiverItem : swap.senderItem;
      const lastMessage = swap.messages[0];
      return {
        id: `deal-${swap.id}`,
        title: partner.name ?? "Участник Menarium",
        context: `Обмен · ${contextItem.title}`,
        preview: lastMessage?.text ?? "Обмен принят. Договоритесь о деталях.",
        href: exchangeChatHref({ id: swap.id, status: swap.status, isSender }),
        unread: swap._count.messages,
        at: lastMessage?.createdAt ?? swap.updatedAt,
      };
    }),
    ...recentItemChats.map((thread) => {
      const partner = thread.buyerId === userId ? thread.owner : thread.buyer;
      const lastMessage = thread.messages[0];
      return {
        id: `item-${thread.id}`,
        title: partner.name ?? "Участник Menarium",
        context: `Объявление · ${thread.item.title}`,
        preview: lastMessage?.text ?? "Диалог создан, сообщений пока нет.",
        href: `/profile/chats/item/${thread.id}`,
        unread: thread._count.messages,
        at: lastMessage?.createdAt ?? thread.updatedAt,
      };
    }),
  ]
    .sort((left, right) => right.at.getTime() - left.at.getTime())
    .slice(0, 4);

  const welcomeEmailSent =
    params.welcome === "1"
      ? params.emailSent === "1"
        ? true
        : params.emailSent === "0"
          ? false
          : null
      : null;
  const initialEmailDeliveryState =
    welcomeEmailSent === true ? "sent" : welcomeEmailSent === false ? "failed" : "unknown";

  const metrics = [
    {
      label: "Нужно ответить",
      value: incomingPending,
      href: "/exchange?tab=incoming",
      icon: Clock3,
      urgent: incomingPending > 0,
    },
    {
      label: "Новых сообщений",
      value: unreadMessages,
      href: "/profile/chats",
      icon: MessageCircle,
      urgent: unreadMessages > 0,
    },
    {
      label: "Опубликовано",
      value: activeItems,
      href: "/my-items?status=active",
      icon: PackageCheck,
      urgent: false,
    },
    {
      label: "Активных обменов",
      value: activeSwaps,
      href: "/exchange",
      icon: Repeat2,
      urgent: false,
    },
  ];

  return (
    <AppShell>
      <div className="page-enter min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-28">
        <div className="mx-auto max-w-[1360px] space-y-5">
          {!user ? (
            <EmptyState
              title="Войдите в личный кабинет"
              description="Профиль Menarium — ваш центр обменов, объявлений, чатов и уведомлений."
              actionHref={loginHref("/profile")}
              actionLabel="Войти"
            />
          ) : (
            <>
              {params.verified === "1" && user.emailVerified ? (
                <ProfileNotice kind="verified" />
              ) : params.welcome === "1" ? (
                <ProfileNotice kind="welcome" />
              ) : null}

              <GlassCard className="overflow-hidden border border-white/8 p-4 sm:p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
                    <div className="relative shrink-0">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name ?? "Аватар"}
                          width={72}
                          height={72}
                          className="h-14 w-14 rounded-[18px] object-cover shadow-lg shadow-blue-500/15 sm:h-[72px] sm:w-[72px] sm:rounded-[20px]"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-blue-500 to-teal-400 shadow-lg shadow-blue-500/15 sm:h-[72px] sm:w-[72px] sm:rounded-[20px]">
                          <span className="text-xl font-bold">{getInitials(user.name, user.email)}</span>
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0a0e16] bg-teal-400" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-white/52">
                        Личный кабинет
                      </p>
                      <h1 className="mt-1 truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                        {user.name ?? "Участник Menarium"}
                      </h1>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {user.emailVerified ? (
                          <Badge variant="teal">
                            <CheckCircle2 className="h-3 w-3" />
                            Почта подтверждена
                          </Badge>
                        ) : (
                          <Badge variant="gold">Подтвердите почту</Badge>
                        )}
                        <Badge variant="glass">
                          <MapPin className="h-3 w-3" />
                          {user.city ?? "Город не указан"}
                        </Badge>
                        <span className="text-xs text-white/50">
                          С нами с {new Intl.DateTimeFormat("ru-RU", {
                            month: "long",
                            year: "numeric",
                          }).format(user.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <MenariumLinkButton href="/favorites" variant="ghost" size="sm" className="w-full sm:w-auto">
                      <Heart className="h-4 w-4" />
                      Избранное
                      {favoriteCount > 0 ? (
                        <span className="rounded-full bg-rose-300/14 px-1.5 py-0.5 text-[10px] text-rose-100/80">
                          {favoriteCount}
                        </span>
                      ) : null}
                    </MenariumLinkButton>
                    <MenariumLinkButton href={`/user/${user.id}`} variant="ghost" size="sm" className="w-full sm:w-auto">
                      <Eye className="h-4 w-4" />
                      Публичный профиль
                    </MenariumLinkButton>
                    <MenariumLinkButton href="/profile/edit" variant="secondary" size="sm" className="w-full sm:w-auto">
                      Настройки
                    </MenariumLinkButton>
                    <SignOutButton className="w-full sm:w-auto" />
                  </div>
                </div>
              </GlassCard>

              <section className="reveal-grid grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Сводка профиля">
                {metrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <Link key={metric.label} href={metric.href}>
                      <GlassCard
                        className={cn(
                          "h-full border p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.055] sm:p-5",
                          metric.urgent
                            ? "border-amber-300/20 bg-amber-300/[0.055]"
                            : "border-white/8 bg-white/[0.025]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              metric.urgent ? "text-amber-200" : "text-teal-200/75",
                            )}
                          />
                          {metric.urgent ? <span className="h-2 w-2 rounded-full bg-amber-300" /> : null}
                        </div>
                        <p className="mt-4 text-2xl font-semibold sm:text-3xl">{metric.value}</p>
                        <p className="mt-1 text-xs text-white/58">{metric.label}</p>
                      </GlassCard>
                    </Link>
                  );
                })}
              </section>

              {!user.emailVerified ? (
                <EmailVerifyBanner
                  email={user.email}
                  initialDeliveryState={initialEmailDeliveryState}
                />
              ) : null}
              {activation ? <ActivationPanel activation={activation} /> : null}

              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-5">
                  <GlassCard className="border border-white/8 p-5 sm:p-6">
                    <div className="mb-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/65">
                          Сейчас
                        </p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                          Требует внимания
                        </h2>
                      </div>
                      <MenariumLinkButton href="/exchange" variant="ghost" size="sm">
                        Все обмены
                      </MenariumLinkButton>
                    </div>

                    {recentIncoming.length > 0 ? (
                      <div className="space-y-3">
                        {recentIncoming.map((swap) => (
                          <div
                            key={swap.id}
                            className="rounded-[20px] border border-amber-300/16 bg-amber-300/[0.045] p-4"
                          >
                            <Link
                              href={`/exchange?tab=incoming&swap=${swap.id}`}
                              className="mb-3 flex items-start justify-between gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70"
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold">{swap.sender.name ?? "Участник Menarium"}</p>
                                  <Badge variant="gold">Нужно ответить</Badge>
                                </div>
                                <p className="mt-1 text-sm text-white/48">
                                  {swap.receiverItem.title}
                                  <span className="mx-2 text-teal-200/55">↔</span>
                                  {swap.senderItem.title}
                                </p>
                              </div>
                              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/35" />
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
                        {incomingPending > recentIncoming.length ? (
                          <MenariumLinkButton
                            href="/exchange?tab=incoming"
                            variant="secondary"
                            size="sm"
                            className="w-full"
                          >
                            Ещё предложений: {incomingPending - recentIncoming.length}
                          </MenariumLinkButton>
                        ) : null}
                      </div>
                    ) : recentAccepted.length > 0 ? (
                      <div className="space-y-3">
                        {recentAccepted.map((swap) => {
                          const isSender = swap.senderId === userId;
                          const partner = isSender ? swap.receiver : swap.sender;
                          const yourItem = isSender ? swap.senderItem : swap.receiverItem;
                          const theirItem = isSender ? swap.receiverItem : swap.senderItem;
                          return (
                            <Link
                              key={swap.id}
                              href={`/exchange?tab=matches&swap=${swap.id}`}
                              className="flex items-center justify-between gap-4 rounded-[20px] border border-teal-300/16 bg-teal-300/[0.045] p-4 transition hover:bg-teal-300/[0.075]"
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold">{partner.name ?? "Участник Menarium"}</p>
                                  <Badge variant="teal">Договоритесь в чате</Badge>
                                </div>
                                <p className="mt-1 text-sm text-white/48">
                                  {yourItem.title}
                                  <span className="mx-2 text-teal-200/55">↔</span>
                                  {theirItem.title}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 shrink-0 text-teal-200/70" />
                            </Link>
                          );
                        })}
                      </div>
                    ) : unreadMessages > 0 ? (
                      <Link
                        href="/profile/chats"
                        className="flex items-center justify-between gap-4 rounded-[20px] border border-blue-300/16 bg-blue-400/[0.05] p-4 transition hover:bg-blue-400/[0.08]"
                      >
                        <div>
                          <p className="font-semibold">Есть непрочитанные сообщения</p>
                          <p className="mt-1 text-sm text-white/45">Ответь людям, чтобы обмен не потерял темп.</p>
                        </div>
                        <Badge variant="purple">{unreadMessages}</Badge>
                      </Link>
                    ) : (
                      <div className="flex flex-col items-start justify-between gap-4 rounded-[20px] border border-teal-300/12 bg-teal-300/[0.035] p-5 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
                          <div>
                            <p className="font-semibold">Всё под контролем</p>
                            <p className="mt-1 text-sm text-white/43">Новых решений и непрочитанных сообщений сейчас нет.</p>
                          </div>
                        </div>
                        <MenariumLinkButton href="/swipe" variant="secondary" size="sm">
                          Найти обмен
                        </MenariumLinkButton>
                      </div>
                    )}
                  </GlassCard>

                  <GlassCard className="border border-white/8 p-5 sm:p-6">
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/60">
                          Диалоги
                        </p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight">Последние сообщения</h2>
                      </div>
                      <MenariumLinkButton href="/profile/chats" variant="ghost" size="sm">
                        Все чаты
                      </MenariumLinkButton>
                    </div>

                    {chats.length > 0 ? (
                      <div className="divide-y divide-white/[0.055]">
                        {chats.map((chat) => (
                          <Link
                            key={chat.id}
                            href={chat.href}
                            className="flex items-start gap-3 rounded-[16px] px-2 py-3.5 transition hover:bg-white/[0.035] sm:items-center"
                          >
                            <span
                              className={cn(
                                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]",
                                chat.unread
                                  ? "bg-gradient-to-br from-blue-500/55 to-teal-400/45 text-white"
                                  : "bg-white/[0.055] text-white/38",
                              )}
                            >
                              <MessageCircle className="h-5 w-5" />
                              {chat.unread ? (
                                <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-amber-300 px-1 text-[9px] font-bold text-[#171008]">
                                  {chat.unread > 9 ? "9+" : chat.unread}
                                </span>
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-white">{chat.title}</span>
                                {chat.unread ? <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> : null}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-white/35">{chat.context}</span>
                              <span className="mt-1 block truncate text-sm text-white/58">{chat.preview}</span>
                            </span>
                            <time className="shrink-0 pt-1 text-xs text-white/28" dateTime={chat.at.toISOString()}>
                              {formatChatTime(chat.at)}
                            </time>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-[18px] border border-white/7 bg-white/[0.02] px-4 py-5 text-sm text-white/40">
                        Диалогов пока нет. Они появятся после вопроса по объявлению или принятого обмена.
                      </p>
                    )}
                  </GlassCard>
                </div>

                <aside className="space-y-5">
                  <GlassCard className="border border-white/8 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-200/60">Ваши вещи</p>
                        <h2 className="mt-1 text-lg font-semibold">Мои объявления</h2>
                      </div>
                      <MenariumLinkButton href="/new" size="sm">Добавить</MenariumLinkButton>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Опубликовано", value: activeItems, href: "/my-items?status=active", icon: PackageCheck },
                        { label: "В сделке", value: inDealItems, href: "/my-items?status=deal", icon: Repeat2 },
                        { label: "На паузе", value: pausedItems, href: "/my-items?status=paused", icon: CirclePause },
                        { label: "История", value: archivedItems, href: "/my-items?status=history", icon: CheckCircle2 },
                      ].map((entry) => {
                        const Icon = entry.icon;
                        return (
                          <Link
                            key={entry.label}
                            href={entry.href}
                            className="rounded-[16px] border border-white/7 bg-white/[0.025] p-3 transition hover:bg-white/[0.055]"
                          >
                            <Icon className="h-4 w-4 text-teal-200/65" />
                            <span className="mt-3 block text-xl font-semibold">{entry.value}</span>
                            <span className="mt-0.5 block text-[11px] text-white/35">{entry.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                    <Link
                      href="/favorites"
                      className="mt-3 flex items-center gap-3 rounded-[16px] border border-rose-300/12 bg-rose-300/[0.045] px-3.5 py-3 transition hover:border-rose-300/22 hover:bg-rose-300/[0.08]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-rose-300/10 text-rose-100/75">
                        <Heart className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-white/86">Избранное</span>
                        <span className="block text-[11px] text-white/38">Сохранённые вещи и рекомендации</span>
                      </span>
                      <strong className="text-lg text-white/82">{favoriteCount}</strong>
                    </Link>
                    <MenariumLinkButton href="/my-items" variant="secondary" size="sm" className="mt-3 w-full">
                      Управлять объявлениями
                    </MenariumLinkButton>
                  </GlassCard>

                  <GlassCard className="border border-white/8 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue-200/70" />
                        <h2 className="font-semibold">Непрочитанное</h2>
                      </div>
                      {unreadNotifications > 0 ? <Badge variant="purple">{unreadNotifications}</Badge> : null}
                    </div>
                    {recentNotifications.length > 0 ? (
                      <div className="space-y-2">
                        {recentNotifications.map((notification) => (
                          <Link
                            key={notification.id}
                            href={getSafeNotificationHref(notification.href) ?? "/notifications"}
                            className="block rounded-[15px] border border-white/7 bg-white/[0.025] px-3.5 py-3 transition hover:bg-white/[0.055]"
                          >
                            <p className="line-clamp-1 text-sm font-medium">{notification.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-4 text-white/38">{notification.message}</p>
                          </Link>
                        ))}
                        <MenariumLinkButton href="/notifications" variant="ghost" size="sm" className="w-full">
                          Все уведомления
                        </MenariumLinkButton>
                      </div>
                    ) : (
                      <div className="rounded-[16px] border border-teal-300/10 bg-teal-300/[0.03] p-4">
                        <p className="text-sm font-medium text-white/70">Всё прочитано</p>
                        <p className="mt-1 text-xs leading-4 text-white/35">Новые события появятся здесь и в верхней панели.</p>
                      </div>
                    )}
                  </GlassCard>

                  <GlassCard className="border border-white/8 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/30">История</p>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-3xl font-semibold">{completedSwaps}</p>
                        <p className="mt-1 text-xs text-white/38">завершённых обменов</p>
                      </div>
                      <MenariumLinkButton href="/exchange?tab=matches&filter=history" variant="secondary" size="sm">
                        Открыть
                      </MenariumLinkButton>
                    </div>
                  </GlassCard>

                  <GlassCard className="border border-teal-300/10 bg-gradient-to-br from-teal-300/[0.055] to-blue-400/[0.035] p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-teal-300/10 text-teal-200">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">Центр безопасности</p>
                          {activeSafetyReports > 0 ? (
                            <Badge variant="gold">{activeSafetyReports} в работе</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-4 text-white/38">
                          Обращения, статусы проверок и защита сделок.
                        </p>
                      </div>
                    </div>
                    <MenariumLinkButton href="/profile/safety" variant="secondary" size="sm" className="mt-4 w-full">
                      Открыть
                    </MenariumLinkButton>
                  </GlassCard>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
