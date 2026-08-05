import Image from "next/image";
import Link from "next/link";
import { ItemStatus, SwapStatus } from "@prisma/client";
import {
  ArrowRight,
  CheckCircle2,
  Heart,
  MapPin,
  MessageCircle,
  PackageCheck,
  Pencil,
  Repeat2,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard, SurfaceCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCard } from "@/components/menarium/item-card";
import { toItemCardView } from "@/features/items/presenters";
import { serializeItem } from "@/features/items/serializers";
import { expirePendingSwapOffers } from "@/features/exchange/expiration";
import { prisma } from "@/lib/prisma";
import { cn, loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { EmailVerifyBanner } from "./email-verify-banner";
import { SignOutButton } from "./profile-actions";
import { ProfileNotice } from "./profile-notice";

export const dynamic = "force-dynamic";

const DEAL_CHAT_STATUSES: SwapStatus[] = [
  SwapStatus.ACCEPTED,
  SwapStatus.COMPLETED,
  SwapStatus.CANCELLED,
];

type ProfilePageProps = {
  searchParams: Promise<{ welcome?: string; emailSent?: string; verified?: string }>;
};

function getInitials(name: string | null, email: string) {
  return (name?.trim() || email)
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatChatTime(value: Date) {
  const now = new Date();
  const isToday = value.toDateString() === now.toDateString();
  return isToday
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

  const [itemGroups, ownItems, favoriteCount, pendingIncoming, acceptedSwaps, unreadDealMessages, unreadItemMessages, recentDealChats, recentItemChats] = userId
    ? await Promise.all([
        prisma.item.groupBy({
          by: ["status"],
          where: { ownerId: userId },
          _count: { _all: true },
        }),
        prisma.item.findMany({
          where: {
            ownerId: userId,
            status: { in: [ItemStatus.ACTIVE, ItemStatus.IN_DEAL, ItemStatus.PAUSED] },
          },
          include: {
            images: true,
            owner: { select: { id: true, name: true, city: true, image: true } },
            _count: { select: { favorites: true } },
          },
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
          take: 4,
        }),
        prisma.favorite.count({ where: { userId } }),
        prisma.swapRequest.count({ where: { receiverId: userId, status: SwapStatus.PENDING } }),
        prisma.swapRequest.count({
          where: {
            status: SwapStatus.ACCEPTED,
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
            item: { select: { title: true } },
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
    : [[], [], 0, 0, 0, 0, 0, [], []];

  const itemCounts: Record<ItemStatus, number> = {
    [ItemStatus.ACTIVE]: 0,
    [ItemStatus.PAUSED]: 0,
    [ItemStatus.IN_DEAL]: 0,
    [ItemStatus.ARCHIVED]: 0,
  };
  for (const entry of itemGroups) itemCounts[entry.status] = entry._count._all;

  const unreadMessages = unreadDealMessages + unreadItemMessages;
  const chats = [
    ...recentDealChats.map((swap) => {
      const isSender = swap.senderId === userId;
      const partner = isSender ? swap.receiver : swap.sender;
      const yourItem = isSender ? swap.senderItem : swap.receiverItem;
      const theirItem = isSender ? swap.receiverItem : swap.senderItem;
      const lastMessage = swap.messages[0];
      return {
        id: `deal-${swap.id}`,
        title: partner.name ?? "Участник Менариум",
        context: `Обмен · ${theirItem.title}`,
        ownContext: `Ваше предложение: ${yourItem.title}`,
        preview: lastMessage?.text ?? "Сообщений пока нет",
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
        title: partner.name ?? "Участник Менариум",
        context: `Объявление · ${thread.item.title}`,
        ownContext: null,
        preview: lastMessage?.text ?? "Сообщений пока нет",
        href: `/profile/chats/item/${thread.id}`,
        unread: thread._count.messages,
        at: lastMessage?.createdAt ?? thread.updatedAt,
      };
    }),
  ]
    .sort((left, right) => right.at.getTime() - left.at.getTime())
    .slice(0, 4);

  const initialEmailDeliveryState =
    params.welcome === "1" && params.emailSent === "1"
      ? "sent"
      : params.welcome === "1" && params.emailSent === "0"
        ? "failed"
        : "unknown";

  return (
    <AppShell>
      <div className="page-enter min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-28">
        <div className="mx-auto max-w-[1360px]">
          {!user ? (
            <EmptyState
              title="Войдите в личный кабинет"
              description="Здесь находятся ваши объявления, обмены, сообщения и настройки."
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
                      <p className="type-kicker text-white/48">Личный кабинет</p>
                      <h1 className="type-page-title mt-1 truncate text-2xl sm:text-3xl">
                        {user.name ?? "Участник Менариум"}
                      </h1>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/48">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {user.city ?? "Город не указан"}
                        </span>
                        <span>С нами с {new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(user.createdAt)}</span>
                        {user.emailVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-teal-200/70">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Почта подтверждена
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MenariumLinkButton href={`/user/${user.id}`} variant="secondary" size="sm">
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

              <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
                <SurfaceCard className="hidden p-2 lg:sticky lg:top-28 lg:block">
                  <nav className="grid gap-1" aria-label="Разделы личного кабинета">
                    {[
                      { href: "#my-listings", label: "Мои объявления", icon: PackageCheck, count: itemCounts[ItemStatus.ACTIVE], active: true },
                      { href: "/profile/chats", label: "Сообщения", icon: MessageCircle, count: unreadMessages },
                      { href: "/exchange", label: "Обмены", icon: Repeat2, count: pendingIncoming + acceptedSwaps },
                      { href: "/favorites", label: "Избранное", icon: Heart, count: favoriteCount },
                      { href: "/profile/edit", label: "Профиль и настройки", icon: UserRound, count: 0 },
                      { href: "/profile/safety", label: "Безопасность", icon: ShieldCheck, count: 0 },
                    ].map((entry) => {
                      const Icon = entry.icon;
                      return (
                        <Link
                          key={entry.label}
                          href={entry.href}
                          aria-current={entry.active ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-[15px] px-3.5 text-sm transition",
                            entry.active
                              ? "bg-white/[0.08] text-white"
                              : "text-white/52 hover:bg-white/[0.045] hover:text-white",
                          )}
                        >
                          <Icon className={cn("h-4 w-4", entry.active ? "text-teal-200" : "text-white/38")} />
                          <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                          {entry.count > 0 ? (
                            <span className="rounded-full bg-teal-300/12 px-2 py-0.5 text-[10px] font-semibold text-teal-100/75">
                              {entry.count > 99 ? "99+" : entry.count}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </nav>
                </SurfaceCard>

                <main className="min-w-0 space-y-5">
                  <GlassCard id="my-listings" className="scroll-mt-28 border border-white/8 p-4 sm:p-5">
                    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                      <div>
                        <p className="type-kicker text-teal-200/55">Ваши вещи и услуги</p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Мои объявления</h2>
                      </div>
                      <MenariumLinkButton href="/new" size="sm">Добавить</MenariumLinkButton>
                    </header>

                    <nav className="mt-5 grid grid-cols-2 gap-1 rounded-[18px] border border-white/7 bg-black/10 p-1 sm:grid-cols-4" aria-label="Статус объявлений">
                      {[
                        { label: "Активные", count: itemCounts[ItemStatus.ACTIVE], href: "/my-items?status=active" },
                        { label: "В обмене", count: itemCounts[ItemStatus.IN_DEAL], href: "/my-items?status=deal" },
                        { label: "На паузе", count: itemCounts[ItemStatus.PAUSED], href: "/my-items?status=paused" },
                        { label: "История", count: itemCounts[ItemStatus.ARCHIVED], href: "/my-items?status=history" },
                      ].map((entry, index) => (
                        <Link
                          key={entry.label}
                          href={entry.href}
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-[13px] px-3 py-2.5 text-sm transition",
                            index === 0 ? "bg-white/[0.08] text-white" : "text-white/48 hover:bg-white/[0.045] hover:text-white",
                          )}
                        >
                          {entry.label}
                          <span className={index === 0 ? "text-teal-200" : "text-white/30"}>{entry.count}</span>
                        </Link>
                      ))}
                    </nav>

                    {ownItems.length > 0 ? (
                      <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {ownItems.map((item, index) => {
                          const publicItem = serializeItem(item);
                          const card = toItemCardView(publicItem, item._count.favorites);
                          return (
                            <div key={item.id} className="relative min-w-0">
                              <ItemCard {...card} priority={index < 2} />
                              <Link
                                href={`/item/${item.id}/edit`}
                                aria-label={`Редактировать «${item.title}»`}
                                className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-[13px] border border-white/12 bg-[#090d14]/82 text-white/72 shadow-lg backdrop-blur-xl transition hover:bg-[#111925] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              {item.status !== ItemStatus.ACTIVE ? (
                                <Badge
                                  variant={item.status === ItemStatus.IN_DEAL ? "teal" : "glass"}
                                  className="absolute bottom-4 left-4 z-20 bg-[#090d14]/86"
                                >
                                  {item.status === ItemStatus.IN_DEAL ? "В обмене" : "На паузе"}
                                </Badge>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-5">
                        <EmptyState
                          title="Объявлений пока нет"
                          description="Добавьте вещь или услугу, чтобы начать обмениваться."
                          actionHref="/new"
                          actionLabel="Добавить объявление"
                        />
                      </div>
                    )}

                    {ownItems.length > 0 ? (
                      <div className="mt-5 flex justify-end border-t border-white/7 pt-4">
                        <Link href="/my-items" className="inline-flex items-center gap-2 text-sm font-medium text-teal-200/75 transition hover:text-teal-100">
                          Все объявления <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    ) : null}
                  </GlassCard>

                  <SurfaceCard className="overflow-hidden">
                    <header className="flex items-center justify-between gap-4 border-b border-white/7 px-4 py-4 sm:px-5">
                      <div>
                        <p className="type-kicker text-white/40">Сообщения</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight">Последние разговоры</h2>
                      </div>
                      <Link href="/profile/chats" className="text-sm font-medium text-teal-200/70 transition hover:text-teal-100">Все чаты</Link>
                    </header>
                    {chats.length > 0 ? (
                      <div>
                        {chats.map((chat) => (
                          <Link
                            key={chat.id}
                            href={chat.href}
                            className={cn(
                              "group flex items-start gap-3 border-b border-white/[0.05] px-4 py-4 transition last:border-b-0 hover:bg-white/[0.035] sm:items-center sm:px-5",
                              chat.unread > 0 && "bg-blue-400/[0.025]",
                            )}
                          >
                            <span className={cn(
                              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]",
                              chat.unread > 0 ? "bg-gradient-to-br from-blue-500/60 to-teal-400/50" : "bg-white/[0.05] text-white/38",
                            )}>
                              <MessageCircle className="h-5 w-5" />
                              {chat.unread > 0 ? (
                                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-300 px-1 text-[9px] font-bold text-[#171008]">
                                  {chat.unread > 9 ? "9+" : chat.unread}
                                </span>
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center gap-2">
                                <strong className="truncate text-sm">{chat.title}</strong>
                                <span className="truncate text-xs text-white/36">{chat.context}</span>
                              </span>
                              {chat.ownContext ? <span className="mt-0.5 block truncate text-xs text-teal-200/48">{chat.ownContext}</span> : null}
                              <span className={cn("mt-1 block truncate text-sm", chat.unread > 0 ? "text-white/78" : "text-white/48")}>{chat.preview}</span>
                            </span>
                            <time className="shrink-0 text-xs text-white/28" dateTime={chat.at.toISOString()}>{formatChatTime(chat.at)}</time>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="px-5 py-8 text-sm text-white/45">Разговоров пока нет.</div>
                    )}
                  </SurfaceCard>

                  <SurfaceCard className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="type-kicker text-white/40">Аккаунт</p>
                        <h2 className="mt-1 text-lg font-semibold">Профиль и безопасность</h2>
                      </div>
                      <MenariumLinkButton href="/profile/edit" variant="ghost" size="sm">Настройки</MenariumLinkButton>
                    </div>
                    {!user.emailVerified ? (
                      <EmailVerifyBanner
                        email={user.email}
                        initialDeliveryState={initialEmailDeliveryState}
                        compact
                      />
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Link href="/profile/edit" className="flex items-center gap-3 rounded-[16px] border border-white/7 bg-white/[0.025] p-3.5 transition hover:bg-white/[0.05]">
                        <Settings className="h-4 w-4 text-teal-200/65" />
                        <span className="min-w-0 flex-1 text-sm font-medium">Личные данные</span>
                        <ArrowRight className="h-4 w-4 text-white/25" />
                      </Link>
                      <Link href="/profile/safety" className="flex items-center gap-3 rounded-[16px] border border-white/7 bg-white/[0.025] p-3.5 transition hover:bg-white/[0.05]">
                        <ShieldCheck className="h-4 w-4 text-teal-200/65" />
                        <span className="min-w-0 flex-1 text-sm font-medium">Безопасность</span>
                        <ArrowRight className="h-4 w-4 text-white/25" />
                      </Link>
                    </div>
                  </SurfaceCard>
                </main>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
