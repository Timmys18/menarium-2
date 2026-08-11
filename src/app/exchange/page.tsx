import Link from "next/link";
import { ItemStatus, Prisma, SwapStatus } from "@prisma/client";
import { CheckCircle2, Clock3, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { BrandGlyph, BrandMark } from "@/components/menarium/brand";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";
import { TrustActions } from "@/components/trust/trust-actions";
import { loadDealMessagePage } from "@/features/chat/message-pages";
import { markDealChatRead } from "@/features/chat/read-state";
import { pickMutualPendingSwapIds } from "@/features/exchange/matches";
import { expirePendingSwapOffers } from "@/features/exchange/expiration";
import { serializeDealMessage } from "@/features/exchange/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { serializeItem } from "@/features/items/serializers";
import { prisma } from "@/lib/prisma";
import { cn, loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { ExchangeDealPanel } from "./exchange-controls";
import { ExchangeReviewPanel } from "./exchange-review-panel";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ swap?: string; tab?: string; filter?: string; page?: string; notice?: string }>;
};

type ExchangeTab = "incoming" | "outgoing" | "matches";
type ExchangeFilter = "active" | "history";
type StatusVariant = "glass" | "teal" | "purple" | "danger";

const EXCHANGE_PAGE_SIZE = 30;
const ACTIVE_STATUSES: SwapStatus[] = [SwapStatus.PENDING, SwapStatus.ACCEPTED];
const HISTORY_STATUSES: SwapStatus[] = [
  SwapStatus.DECLINED,
  SwapStatus.CANCELLED,
  SwapStatus.COMPLETED,
  SwapStatus.EXPIRED,
];

const swapInclude = {
  sender: { select: { id: true, name: true, city: true, image: true } },
  receiver: { select: { id: true, name: true, city: true, image: true } },
  senderItem: {
    include: {
      images: true,
      owner: { select: { id: true, name: true, city: true, image: true } },
    },
  },
  receiverItem: {
    include: {
      images: true,
      owner: { select: { id: true, name: true, city: true, image: true } },
    },
  },
} as const;

function exchangeHref(
  tab: ExchangeTab,
  swapId?: string,
  filter: ExchangeFilter = "active",
  page?: number,
) {
  const search = new URLSearchParams();
  search.set("tab", tab);
  search.set("filter", filter);
  if (swapId) search.set("swap", swapId);
  if (page && page > 1) search.set("page", String(page));
  return `/profile/exchanges?${search.toString()}`;
}

function statusPresentation(
  swap: {
    status: SwapStatus;
    senderId: string;
    senderCompleted: boolean;
    receiverCompleted: boolean;
  },
  userId: string,
): { label: string; description: string; variant: StatusVariant } {
  const isSender = swap.senderId === userId;
  const completedByUser = isSender ? swap.senderCompleted : swap.receiverCompleted;

  if (swap.status === SwapStatus.PENDING) {
    return isSender
      ? {
          label: "Ждём ответа",
          description: "Предложение отправлено. Партнёр ещё не принял решение.",
          variant: "purple",
        }
      : {
          label: "Нужно ответить",
          description: "Откройте предложение и решите, подходит ли вам этот обмен.",
          variant: "teal",
        };
  }

  if (swap.status === SwapStatus.ACCEPTED) {
    return completedByUser
      ? {
          label: "Ждём партнёра",
          description: "Вы подтвердили завершение. Осталось подтверждение второй стороны.",
          variant: "teal",
        }
      : {
          label: "В чате",
          description: "Обмен принят. Детали остаются в чате этой сделки.",
          variant: "teal",
        };
  }

  if (swap.status === SwapStatus.COMPLETED) {
    return {
      label: "Обмен завершён",
      description: "Обе стороны подтвердили завершение обмена.",
      variant: "teal",
    };
  }

  if (swap.status === SwapStatus.DECLINED) {
    return {
      label: "Предложение отклонено",
      description: "Этот вариант не подошёл, но объявления снова доступны для других обменов.",
      variant: "danger",
    };
  }

  if (swap.status === SwapStatus.EXPIRED) {
    return {
      label: "Срок истёк",
      description: "На предложение не ответили за семь дней. Вещи остаются доступны для новых вариантов.",
      variant: "glass",
    };
  }

  return {
    label: "Обмен отменён",
    description: "Сделка закрыта, объявления снова доступны для других предложений.",
    variant: "glass",
  };
}

export async function ExchangePageContent({ searchParams }: Props) {
  const userId = await getCurrentUserId();
  const params = await searchParams;
  if (userId) await expirePendingSwapOffers(prisma, { userId });
  const requestedPage = Math.max(1, Math.floor(Number(params.page) || 1));
  const participantWhere: Prisma.SwapRequestWhereInput = userId
    ? { OR: [{ senderId: userId }, { receiverId: userId }] }
    : { id: { in: [] } };

  const [pendingForMatches, requestedSwapById, totalSwaps, activeItemCount] = userId
    ? await Promise.all([
        prisma.swapRequest.findMany({
          where: { ...participantWhere, status: SwapStatus.PENDING },
          select: {
            id: true,
            senderId: true,
            receiverId: true,
            senderItemId: true,
            receiverItemId: true,
          },
        }),
        params.swap
          ? prisma.swapRequest.findFirst({
              where: { id: params.swap, ...participantWhere },
              include: swapInclude,
            })
          : Promise.resolve(null),
        prisma.swapRequest.count({ where: participantWhere }),
        prisma.item.count({ where: { ownerId: userId, status: ItemStatus.ACTIVE } }),
      ])
    : [[], null, 0, 0];

  const pendingRows = pendingForMatches.map((swap) => ({
    id: swap.id,
    senderId: swap.senderId,
    receiverId: swap.receiverId,
    senderItemId: swap.senderItemId,
    receiverItemId: swap.receiverItemId,
  }));
  const mutualPendingIds = userId ? pickMutualPendingSwapIds(pendingRows, userId) : new Set<string>();
  const needsResponseCount = userId
    ? pendingRows.filter((swap) => swap.receiverId === userId).length
    : 0;
  const requestedSwap = requestedSwapById ?? undefined;
  const activeFilter: ExchangeFilter =
    params.filter === "history"
      ? "history"
      : params.filter === "active"
        ? "active"
        : requestedSwap && HISTORY_STATUSES.includes(requestedSwap.status)
          ? "history"
          : "active";
  const statusFilter = activeFilter === "active" ? ACTIVE_STATUSES : HISTORY_STATUSES;
  const explicitTab: ExchangeTab | null =
    params.tab === "outgoing" || params.tab === "matches" || params.tab === "incoming"
      ? params.tab
      : null;

  function belongsToTab(
    swap: { id: string; senderId: string; receiverId: string; status: SwapStatus },
    tab: ExchangeTab,
  ) {
    if (!userId || !statusFilter.includes(swap.status)) return false;
    if (tab === "incoming") return swap.receiverId === userId;
    if (tab === "outgoing") return swap.senderId === userId;
    return (
      mutualPendingIds.has(swap.id) ||
      swap.status === SwapStatus.ACCEPTED ||
      swap.status === SwapStatus.COMPLETED
    );
  }

  const tabsForRequested: ExchangeTab[] = requestedSwap
    ? ([
        belongsToTab(requestedSwap, "matches") ? "matches" : null,
        belongsToTab(requestedSwap, "incoming") ? "incoming" : null,
        belongsToTab(requestedSwap, "outgoing") ? "outgoing" : null,
      ].filter(Boolean) as ExchangeTab[])
    : [];

  let activeTab: ExchangeTab =
    explicitTab && (!requestedSwap || tabsForRequested.includes(explicitTab))
      ? explicitTab
      : (tabsForRequested[0] ?? explicitTab ?? "incoming");

  const matchKinds: Prisma.SwapRequestWhereInput[] = [
    { status: { in: [SwapStatus.ACCEPTED, SwapStatus.COMPLETED] } },
  ];
  if (mutualPendingIds.size > 0) matchKinds.push({ id: { in: [...mutualPendingIds] } });

  const whereByTab: Record<ExchangeTab, Prisma.SwapRequestWhereInput> = {
    incoming: { receiverId: userId ?? "", status: { in: statusFilter } },
    outgoing: { senderId: userId ?? "", status: { in: statusFilter } },
    matches: {
      AND: [participantWhere, { status: { in: statusFilter } }, { OR: matchKinds }],
    },
  };

  const [incomingCount, outgoingCount, matchesCount] = userId
    ? await Promise.all([
        prisma.swapRequest.count({ where: whereByTab.incoming }),
        prisma.swapRequest.count({ where: whereByTab.outgoing }),
        prisma.swapRequest.count({ where: whereByTab.matches }),
      ])
    : [0, 0, 0];
  const tabCounts: Record<ExchangeTab, number> = {
    incoming: incomingCount,
    outgoing: outgoingCount,
    matches: matchesCount,
  };

  if (!explicitTab && !requestedSwap && tabCounts[activeTab] === 0) {
    activeTab =
      (["matches", "outgoing", "incoming"] as const).find((tab) => tabCounts[tab] > 0) ??
      activeTab;
  }

  const exchangeTotalPages = Math.max(1, Math.ceil(tabCounts[activeTab] / EXCHANGE_PAGE_SIZE));
  const page = Math.min(requestedPage, exchangeTotalPages);
  const swapsPage = userId
    ? await prisma.swapRequest.findMany({
        where: whereByTab[activeTab],
        include: swapInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * EXCHANGE_PAGE_SIZE,
        take: EXCHANGE_PAGE_SIZE,
      })
    : [];
  const selectedSwap =
    (requestedSwap && belongsToTab(requestedSwap, activeTab) ? requestedSwap : undefined) ??
    swapsPage[0];
  const exchangeHasMore = page * EXCHANGE_PAGE_SIZE < tabCounts[activeTab];

  const selectedContext =
    selectedSwap && userId
      ? await Promise.all([
          (async () => {
            const [messagePage] = await Promise.all([
              loadDealMessagePage({ swapId: selectedSwap.id }),
              markDealChatRead(userId, selectedSwap.id),
            ]);
            return messagePage;
          })(),
          prisma.review.findUnique({
            where: { swapId_reviewerId: { swapId: selectedSwap.id, reviewerId: userId } },
            select: { id: true, rating: true, comment: true, visibleAt: true, createdAt: true },
          }),
          prisma.review.findFirst({
            where: { swapId: selectedSwap.id, revieweeId: userId, visibleAt: { lte: new Date() } },
            select: { id: true, rating: true, comment: true, visibleAt: true, createdAt: true },
          }),
          prisma.userBlock.findFirst({
            where: {
              OR: [
                {
                  blockerId: userId,
                  blockedId:
                    selectedSwap.senderId === userId
                      ? selectedSwap.receiverId
                      : selectedSwap.senderId,
                },
                {
                  blockerId:
                    selectedSwap.senderId === userId
                      ? selectedSwap.receiverId
                      : selectedSwap.senderId,
                  blockedId: userId,
                },
              ],
            },
            select: { blockerId: true },
          }),
        ])
      : [{ messages: [], nextCursor: null }, null, null, null] as const;
  const [selectedMessagePage, selectedOwnReview, selectedReceivedReview, selectedBlock] = selectedContext;
  const selectedMessages = selectedMessagePage.messages.map(serializeDealMessage);

  const selectedIsIncoming = selectedSwap ? selectedSwap.receiverId === userId : false;
  const selectedTheirItem = selectedSwap
    ? serializeItem(selectedIsIncoming ? selectedSwap.senderItem : selectedSwap.receiverItem)
    : null;
  const selectedYourItem = selectedSwap
    ? serializeItem(selectedIsIncoming ? selectedSwap.receiverItem : selectedSwap.senderItem)
    : null;
  const selectedPartner = selectedSwap
    ? selectedIsIncoming
      ? selectedSwap.sender
      : selectedSwap.receiver
    : null;
  const selectedStatus =
    selectedSwap && userId ? statusPresentation(selectedSwap, userId) : null;
  const selectedOwnBlock = selectedBlock?.blockerId === userId;
  const showSentNotice =
    params.notice === "sent" &&
    selectedSwap?.senderId === userId &&
    selectedSwap.status === SwapStatus.PENDING;
  const showAcceptedNotice =
    params.notice === "accepted" &&
    selectedSwap?.receiverId === userId &&
    selectedSwap.status === SwapStatus.ACCEPTED;
  const activeItemLabel =
    activeItemCount === 1
      ? "активное объявление"
      : activeItemCount >= 2 && activeItemCount <= 4
        ? "активных объявления"
        : "активных объявлений";
  return (
    <div className="min-w-0">
          <header
            className={cn(
              "mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end",
              params.swap ? "hidden lg:flex" : "",
            )}
          >
            <div>
              <h1 className="type-page-title text-3xl sm:text-4xl md:text-5xl">
                Мои <span className="gradient-text">обмены</span>
              </h1>
            </div>
            {userId && totalSwaps > 0 ? (
              needsResponseCount > 0 ? (
                <div className="inline-flex items-center gap-3 self-start rounded-[18px] border border-teal-300/25 bg-teal-300/[0.08] px-4 py-3 md:self-auto">
                  <Clock3 className="h-5 w-5 text-teal-200" />
                  <div>
                    <p className="text-sm font-semibold text-white">Нужно ответить: {needsResponseCount}</p>
                    <Link href={exchangeHref("incoming")} className="text-xs text-teal-200/70 hover:text-teal-100">
                      Посмотреть входящие
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/62 md:self-auto">
                  <CheckCircle2 className="h-4 w-4 text-teal-300" />
                  Новых решений не требуется
                </div>
              )
            ) : null}
          </header>

          {showSentNotice ? (
            <GlassCard className="mb-5 flex items-start gap-3 border border-teal-300/20 bg-teal-300/[0.065] p-4 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-teal-300 text-[#07130f]">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-white">Предложение отправлено</p>
                <p className="mt-1 text-sm leading-6 text-white/62">
                  Партнёр уже получил уведомление. До ответа вы можете отозвать предложение в карточке обмена.
                </p>
              </div>
            </GlassCard>
          ) : null}

          {showAcceptedNotice ? (
            <GlassCard className="mb-5 flex items-start gap-3 border border-teal-300/20 bg-teal-300/[0.065] p-4 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-teal-300 text-[#07130f]">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-white">Обмен принят</p>
                <p className="mt-1 text-sm leading-6 text-white/62">
                  Обе вещи теперь в сделке. Чат уже открыт: напишите партнёру, чтобы согласовать детали обмена.
                </p>
                <a href="#exchange-chat" className="mt-3 inline-block text-sm font-semibold text-teal-200 transition hover:text-teal-100">
                  Открыть чат ↓
                </a>
              </div>
            </GlassCard>
          ) : null}

          {!userId ? (
            <EmptyState
              title="Войдите, чтобы управлять обменами"
              description="Здесь будут предложения других людей, ваши ответы, договорённости и чат каждой сделки."
              actionHref={loginHref("/profile/exchanges")}
              actionLabel="Войти"
            />
          ) : totalSwaps === 0 ? (
            <EmptyState
              title={activeItemCount > 0 ? "Выберите, что хотите получить" : "Добавьте вещь или услугу"}
              description={
                activeItemCount > 0
                  ? `У вас ${activeItemCount} ${activeItemLabel}. Откройте каталог и предложите один из своих вариантов.`
                  : "После публикации вы сможете предлагать обмен в каталоге и свайпе."
              }
              actionHref={activeItemCount > 0 ? "/catalog" : "/new"}
              actionLabel={activeItemCount > 0 ? "Открыть каталог" : "Добавить вещь"}
              secondaryActionHref={activeItemCount > 0 ? "/swipe" : undefined}
              secondaryActionLabel={activeItemCount > 0 ? "Перейти к свайпу" : undefined}
            />
          ) : (
            <>
              <div
                className={cn(
                  "mb-5 flex flex-col gap-3 rounded-[22px] border border-white/8 bg-white/[0.025] p-2 sm:flex-row sm:items-center sm:justify-between",
                  params.swap ? "hidden lg:flex" : "",
                )}
              >
                <nav className="grid grid-cols-3 gap-1 sm:flex sm:overflow-x-auto" aria-label="Виды обменов">
                  {([
                    ["incoming", "Мне предложили", "Входящие", incomingCount],
                    ["outgoing", "Я предложил", "Исходящие", outgoingCount],
                    ["matches", "Договорились", "Взаимно", matchesCount],
                  ] as const).map(([tab, label, mobileLabel, count]) => (
                    <Link
                      key={tab}
                      href={exchangeHref(tab, tab === activeTab ? selectedSwap?.id : undefined, activeFilter)}
                      aria-current={tab === activeTab ? "page" : undefined}
                      className={cn(
                        "min-w-0 overflow-hidden rounded-[15px] px-2 py-2.5 text-xs font-medium transition sm:shrink-0 sm:px-4 sm:text-sm",
                        tab === activeTab
                          ? "bg-gradient-to-r from-blue-500 to-teal-400 text-white shadow-[0_10px_24px_rgba(77,141,255,0.18)]"
                          : "text-white/62 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      <span className="sm:hidden">{mobileLabel}</span>
                      <span className="hidden sm:inline">{label}</span>
                      <span className={cn("ml-1.5 text-[11px] sm:ml-2 sm:text-xs", tab === activeTab ? "text-white/78" : "text-white/62")}>
                        {count}
                      </span>
                    </Link>
                  ))}
                </nav>

                <nav className="flex gap-1 border-t border-white/7 pt-2 sm:border-l sm:border-t-0 sm:pl-2 sm:pt-0" aria-label="Состояние обменов">
                  {([
                    ["active", "Сейчас"],
                    ["history", "История"],
                  ] as const).map(([filter, label]) => (
                    <Link
                      key={filter}
                      href={exchangeHref(activeTab, undefined, filter)}
                      aria-current={activeFilter === filter ? "page" : undefined}
                      className={cn(
                        "rounded-[13px] px-4 py-2 text-sm transition",
                        activeFilter === filter
                          ? "bg-white/[0.11] text-white"
                          : "text-white/62 hover:bg-white/[0.05] hover:text-white/80",
                      )}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(420px,500px)_minmax(0,1fr)] xl:grid-cols-[520px_minmax(0,1fr)]">
                <GlassCard
                  id="exchange-list"
                  className={cn(
                    "border border-white/8 p-4 sm:p-5 lg:order-1",
                    params.swap ? "hidden lg:block" : "order-1",
                  )}
                >
                  <div className="mb-4 flex items-end justify-between gap-4 px-1">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {activeTab === "incoming"
                          ? "Предложения для вас"
                          : activeTab === "outgoing"
                            ? "Твои предложения"
                            : "Взаимные обмены"}
                      </h2>
                      <p className="mt-1 text-xs text-white/62">
                        {activeFilter === "active" ? "Актуальные обмены" : "Завершённые и отменённые"}
                      </p>
                    </div>
                    <span className="text-xs text-white/62">{tabCounts[activeTab]} всего</span>
                  </div>

                  {swapsPage.length === 0 ? (
                    <EmptyState
                      title={
                        activeTab === "incoming"
                          ? "Новых предложений пока нет"
                          : activeTab === "outgoing"
                            ? "Вы пока ничего не предложили"
                            : "Взаимных обменов пока нет"
                      }
                      description={
                        activeFilter === "history"
                          ? "В этой части истории пока пусто."
                          : "Когда появится новый обмен, он будет здесь."
                      }
                      actionHref="/catalog"
                      actionLabel="Открыть каталог"
                    />
                  ) : (
                    <div className="space-y-3">
                      {swapsPage.map((swap) => {
                        const isIncoming = swap.receiverId === userId;
                        const theirItem = serializeItem(isIncoming ? swap.senderItem : swap.receiverItem);
                        const yourItem = serializeItem(isIncoming ? swap.receiverItem : swap.senderItem);
                        const theirCard = toItemCardView(theirItem);
                        const yourCard = toItemCardView(yourItem);
                        const partner = isIncoming ? swap.sender : swap.receiver;
                        const presentation = statusPresentation(swap, userId);
                        const selected = selectedSwap?.id === swap.id;

                        return (
                          <Link
                            key={swap.id}
                            href={`${exchangeHref(activeTab, swap.id, activeFilter, page)}#exchange-detail`}
                            aria-current={selected ? "true" : undefined}
                            className={cn(
                              "group block rounded-[20px] border p-3.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/75 sm:p-4",
                              selected
                                ? "border-blue-300/30 bg-blue-400/[0.075] shadow-[0_14px_34px_rgba(0,0,0,0.16)]"
                                : "border-white/8 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.05]",
                            )}
                          >
                            <article>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-xs text-white/62">
                                  <UserRound className="h-3.5 w-3.5" />
                                  {partner?.name ?? "Участник Менариум"}
                                </span>
                                <Badge variant={presentation.variant}>{presentation.label}</Badge>
                              </div>

                              <div className="mt-3 overflow-hidden rounded-[17px] border border-white/8 bg-[#0a111b]/72">
                                <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] sm:grid-cols-[9rem_minmax(0,1fr)]">
                                  <div className="relative min-h-32 overflow-hidden bg-white/[0.03] sm:min-h-36">
                                    <ItemCoverImage
                                      src={theirCard.image}
                                      alt={theirItem.title}
                                      sizes="(max-width: 640px) 120px, 144px"
                                      imageClassName="transition-transform duration-500 group-hover:scale-105"
                                    />
                                  </div>
                                  <div className="flex min-w-0 flex-col justify-center p-3.5 sm:p-4">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-200/70">Вы получаете</span>
                                    <h3 className="mt-1.5 line-clamp-2 text-base font-semibold text-white">{theirItem.title}</h3>
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/62">{theirCard.category} · {theirCard.city}</p>
                                  </div>
                                </div>
                                <div className="mx-3 flex items-center gap-3 border-t border-white/7 py-3">
                                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[12px] border border-white/8 bg-white/[0.03]">
                                    <ItemCoverImage src={yourCard.image} alt={yourItem.title} sizes="44px" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-teal-200/60">Вы предложили</span>
                                    <span className="mt-0.5 block truncate text-sm font-semibold text-white/82">{yourItem.title}</span>
                                  </div>
                                  <BrandMark size="xs" className="h-7 w-7" />
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/7 pt-3 text-xs">
                                <span className="line-clamp-1 text-white/62">{presentation.description}</span>
                                <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-teal-200">
                                  {swap.status === SwapStatus.ACCEPTED ? <MessageCircle className="h-3.5 w-3.5" /> : null}
                                  {swap.status === SwapStatus.ACCEPTED ? "Открыть чат" : "Подробнее"}
                                </span>
                              </div>
                            </article>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {exchangeTotalPages > 1 ? (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-white/7 pt-5">
                      {page > 1 ? (
                        <Link
                          href={exchangeHref(activeTab, undefined, activeFilter, page - 1)}
                          className="inline-flex min-h-11 items-center rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/78 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65"
                        >
                          ← Назад
                        </Link>
                      ) : null}
                      <span className="text-xs text-white/62">
                        {page} из {exchangeTotalPages}
                      </span>
                      {exchangeHasMore ? (
                        <Link
                          href={exchangeHref(activeTab, undefined, activeFilter, page + 1)}
                          className="inline-flex min-h-11 items-center rounded-[14px] bg-gradient-to-r from-blue-500 to-teal-400 px-4 py-2.5 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/75"
                        >
                          Дальше →
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </GlassCard>

                <GlassCard
                  id="exchange-detail"
                  className={cn(
                    "min-w-0 max-w-full scroll-mt-24 overflow-hidden border border-white/10 p-4 sm:p-5 lg:order-2",
                    params.swap ? "order-1" : "order-2",
                  )}
                >
                  {selectedSwap && selectedTheirItem && selectedYourItem && selectedStatus ? (
                    <>
                      {params.swap ? (
                        <Link
                          href={exchangeHref(activeTab, undefined, activeFilter, page)}
                          className="mb-4 inline-flex min-h-11 items-center rounded-xl px-2 text-sm text-white/78 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65 lg:hidden"
                        >
                          ← Все обмены
                        </Link>
                      ) : null}
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-500/20 to-teal-400/15">
                            <MessageCircle className="h-5 w-5 text-teal-200" />
                          </div>
                          <div className="min-w-0">
                            <h2 className="truncate font-semibold">
                              {selectedPartner?.name ?? "Участник Менариум"}
                            </h2>
                            <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-white/62">
                              <span className="truncate">{selectedYourItem.title}</span>
                              <BrandGlyph className="h-4 w-4 shrink-0 text-teal-200/70" />
                              <span className="truncate">{selectedTheirItem.title}</span>
                            </p>
                          </div>
                        </div>
                        <Badge variant={selectedStatus.variant} className="hidden max-w-[12rem] shrink-0 truncate sm:inline-flex">
                          {selectedStatus.label}
                        </Badge>
                      </div>

                      {selectedSwap.status === SwapStatus.PENDING ? (
                        <p className="-mt-1 mb-4 flex items-center gap-2 text-xs text-white/62">
                          <Clock3 className="h-3.5 w-3.5 text-amber-200/65" />
                          Ответ до {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(selectedSwap.expiresAt)}
                        </p>
                      ) : null}

                      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] sm:items-center">
                        {[
                          { label: "Вы отдаёте", item: selectedYourItem, card: toItemCardView(selectedYourItem) },
                          { label: "Вы получаете", item: selectedTheirItem, card: toItemCardView(selectedTheirItem) },
                        ].map((entry, index) => (
                          <div key={entry.item.id} className={cn("contents", index === 1 && "sm:contents")}>
                            {index === 1 ? (
                              <div className="flex items-center gap-3 sm:block">
                                <span className="h-px flex-1 bg-white/8 sm:hidden" />
                                <BrandMark size="md" className="h-10 w-10 sm:mx-auto" />
                                <span className="h-px flex-1 bg-white/8 sm:hidden" />
                              </div>
                            ) : null}
                            <article className="overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.025]">
                              <div className="relative aspect-[16/10] overflow-hidden bg-white/[0.03]">
                                <ItemCoverImage
                                  src={entry.card.image}
                                  alt={entry.item.title}
                                  sizes="(max-width: 640px) 100vw, 320px"
                                />
                              </div>
                              <div className="p-4">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-200/65">{entry.label}</span>
                                <h3 className="mt-1.5 line-clamp-2 min-h-10 font-semibold text-white">{entry.item.title}</h3>
                                <p className="mt-2 text-xs text-white/62">{entry.card.category} · {entry.card.city}</p>
                              </div>
                            </article>
                          </div>
                        ))}
                      </div>

                      {selectedSwap.status === SwapStatus.COMPLETED ? (
                        <ExchangeReviewPanel
                          swapId={selectedSwap.id}
                          partnerName={selectedPartner?.name ?? "партнёром"}
                          initialReview={
                            selectedOwnReview
                              ? {
                                  ...selectedOwnReview,
                                  visibleAt: selectedOwnReview.visibleAt.toISOString(),
                                  createdAt: selectedOwnReview.createdAt.toISOString(),
                                  isVisible: selectedOwnReview.visibleAt <= new Date(),
                                }
                              : null
                          }
                          receivedReview={
                            selectedReceivedReview
                              ? {
                                  ...selectedReceivedReview,
                                  visibleAt: selectedReceivedReview.visibleAt.toISOString(),
                                  createdAt: selectedReceivedReview.createdAt.toISOString(),
                                  isVisible: true,
                                }
                              : null
                          }
                        />
                      ) : null}

                      <ExchangeDealPanel
                        key={`${selectedSwap.id}:${selectedSwap.status}:${selectedSwap.senderCompleted}:${selectedSwap.receiverCompleted}`}
                        swapId={selectedSwap.id}
                        status={selectedSwap.status}
                        isSender={selectedSwap.senderId === userId}
                        isReceiver={selectedSwap.receiverId === userId}
                        senderCompleted={selectedSwap.senderCompleted}
                        receiverCompleted={selectedSwap.receiverCompleted}
                        communicationBlocked={Boolean(selectedBlock)}
                        currentUserId={userId}
                        partnerName={selectedPartner?.name ?? "участником"}
                        messages={selectedMessages}
                        nextCursor={selectedMessagePage.nextCursor}
                        itemContext={{
                          yourTitle: selectedYourItem.title,
                          yourImage: toItemCardView(selectedYourItem).image,
                          theirTitle: selectedTheirItem.title,
                          theirImage: toItemCardView(selectedTheirItem).image,
                        }}
                        acceptedHref={`/profile/exchanges?tab=matches&swap=${encodeURIComponent(selectedSwap.id)}&notice=accepted`}
                      />

                      {selectedPartner ? (
                        <section
                          aria-labelledby="exchange-safety-title"
                          className="mt-5 rounded-[18px] border border-white/8 bg-white/[0.025] p-4"
                        >
                          <div className="mb-3 flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-teal-400/10 text-teal-200">
                              <ShieldCheck className="h-4.5 w-4.5" />
                            </span>
                            <div>
                              <h3 id="exchange-safety-title" className="text-sm font-semibold">
                                Безопасность сделки
                              </h3>
                              <p className="mt-1 text-xs leading-4 text-white/62">
                                Если что-то пошло не по договорённости, сообщите нам прямо из этого обмена.
                              </p>
                            </div>
                          </div>
                          <TrustActions
                            targetType="USER"
                            targetId={selectedPartner.id}
                            userId={selectedPartner.id}
                            initialBlocked={selectedOwnBlock}
                            swapId={selectedSwap.id}
                          />
                        </section>
                      ) : null}

                    </>
                  ) : (
                    <div className="py-12 text-center">
                      <MessageCircle className="mx-auto h-8 w-8 text-white/62" />
                      <h2 className="mt-4 font-semibold">Выбери обмен</h2>
                      <p className="mt-2 text-sm text-white/62">Здесь появятся детали, действия и чат.</p>
                    </div>
                  )}
                </GlassCard>
              </div>
            </>
          )}
    </div>
  );
}

export default function ExchangePage(props: Props) {
  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
        <div className="mx-auto max-w-7xl">
          <ExchangePageContent {...props} />
        </div>
      </div>
    </AppShell>
  );
}
