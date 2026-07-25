import Link from "next/link";
import { Prisma, SwapStatus } from "@prisma/client";
import { ArrowLeftRight, CheckCircle2, Clock3, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
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
  return `/exchange?${search.toString()}`;
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
          description: "Посмотри предложение и реши, подходит ли тебе этот обмен.",
          variant: "teal",
        };
  }

  if (swap.status === SwapStatus.ACCEPTED) {
    return completedByUser
      ? {
          label: "Ждём партнёра",
          description: "Ты подтвердил завершение. Осталось подтверждение второй стороны.",
          variant: "teal",
        }
      : {
          label: "Договоритесь в чате",
          description: "Обмен принят. Используйте чат, чтобы согласовать все детали напрямую.",
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

function DealProgress({ status }: { status: SwapStatus }) {
  if (
    status === SwapStatus.DECLINED ||
    status === SwapStatus.CANCELLED ||
    status === SwapStatus.EXPIRED
  ) {
    return null;
  }

  const activeIndex =
    status === SwapStatus.COMPLETED
      ? 2
      : status === SwapStatus.ACCEPTED
        ? 1
        : 0;
  const steps = [
    { label: "Предложение", mobileLabel: "Предложение", hint: "Решение" },
    { label: "Договорённость", mobileLabel: "Чат", hint: "В чате" },
    { label: "Завершение", mobileLabel: "Готово", hint: "Обе стороны" },
  ];

  return (
    <ol className="my-4 grid grid-cols-3 gap-2" aria-label="Этапы обмена">
      {steps.map((step, index) => {
        const completed = status === SwapStatus.COMPLETED || index < activeIndex;
        const current = status !== SwapStatus.COMPLETED && index === activeIndex;

        return (
          <li
            key={step.label}
            aria-current={current ? "step" : undefined}
            className={cn(
              "min-w-0 rounded-[14px] border px-1.5 py-3 text-center sm:px-2.5",
              completed
                ? "border-teal-300/18 bg-teal-300/[0.065]"
                : current
                  ? "border-blue-300/25 bg-blue-400/[0.08]"
                  : "border-white/7 bg-white/[0.02]",
            )}
          >
            <span
              className={cn(
                "mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                completed
                  ? "bg-teal-300/16 text-teal-200"
                  : current
                    ? "bg-blue-300/16 text-blue-100"
                    : "bg-white/[0.07] text-white/48",
              )}
            >
              {completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </span>
            <span className={cn("mt-2 block text-xs font-semibold", completed || current ? "text-white/82" : "text-white/48")}>
              <span className="sm:hidden">{step.mobileLabel}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </span>
            <span className="mt-0.5 hidden truncate text-[11px] text-white/48 sm:block">{step.hint}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function ExchangePage({ searchParams }: Props) {
  const userId = await getCurrentUserId();
  const params = await searchParams;
  if (userId) await expirePendingSwapOffers(prisma, { userId });
  const requestedPage = Math.max(1, Math.floor(Number(params.page) || 1));
  const participantWhere: Prisma.SwapRequestWhereInput = userId
    ? { OR: [{ senderId: userId }, { receiverId: userId }] }
    : { id: { in: [] } };

  const [pendingForMatches, requestedSwapById, totalSwaps] = userId
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
      ])
    : [[], null, 0];

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
  const selectedTheirCard = selectedTheirItem ? toItemCardView(selectedTheirItem) : null;
  const selectedYourCard = selectedYourItem ? toItemCardView(selectedYourItem) : null;
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
  return (
    <AppShell>
      <div className="page-enter min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/60">
                Личный центр
              </p>
              <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl md:text-5xl">
                Мои <span className="gradient-text">обмены</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/66 sm:text-base">
                Здесь видно, где нужен твой ответ, где ждём партнёра и о чём уже договорились.
              </p>
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
                <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/55 md:self-auto">
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
                <p className="mt-1 text-sm leading-6 text-white/60">
                  Партнёр уже получил уведомление. До ответа вы можете отозвать предложение в карточке обмена.
                </p>
              </div>
            </GlassCard>
          ) : null}

          {!userId ? (
            <EmptyState
              title="Войдите, чтобы управлять обменами"
              description="Здесь будут предложения других людей, ваши ответы, договорённости и чат каждой сделки."
              actionHref={loginHref("/exchange")}
              actionLabel="Войти"
            />
          ) : totalSwaps === 0 ? (
            <EmptyState
              title="Обменов пока нет"
              description="Найдите интересную вещь в каталоге или свайпе и предложите взамен своё объявление."
              actionHref="/catalog"
              actionLabel="Найти первый обмен"
            />
          ) : (
            <>
              <div className="mb-5 flex flex-col gap-3 rounded-[22px] border border-white/8 bg-white/[0.025] p-2 sm:flex-row sm:items-center sm:justify-between">
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
                          : "text-white/48 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      <span className="sm:hidden">{mobileLabel}</span>
                      <span className="hidden sm:inline">{label}</span>
                      <span className={cn("ml-1.5 text-[11px] sm:ml-2 sm:text-xs", tab === activeTab ? "text-white/78" : "text-white/48")}>
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
                          : "text-white/58 hover:bg-white/[0.05] hover:text-white/80",
                      )}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
                <GlassCard
                  id="exchange-list"
                  className={cn(
                    "border border-white/8 p-4 sm:p-5 lg:order-1",
                    params.swap ? "order-2" : "order-1",
                  )}
                >
                  <div className="mb-4 flex items-end justify-between gap-4 px-1">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {activeTab === "incoming"
                          ? "Предложения для тебя"
                          : activeTab === "outgoing"
                            ? "Твои предложения"
                            : "Обмены с взаимным интересом"}
                      </h2>
                      <p className="mt-1 text-xs text-white/54">
                        {activeFilter === "active" ? "Актуальные обмены" : "Завершённые и отменённые"}
                      </p>
                    </div>
                    <span className="text-xs text-white/50">{tabCounts[activeTab]} всего</span>
                  </div>

                  {swapsPage.length === 0 ? (
                    <EmptyState
                      title={
                        activeTab === "incoming"
                          ? "Новых предложений пока нет"
                          : activeTab === "outgoing"
                            ? "Ты пока ничего не предложил"
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
                              "group block rounded-[20px] border p-3.5 transition sm:p-4",
                              selected
                                ? "border-blue-300/30 bg-blue-400/[0.075] shadow-[0_14px_34px_rgba(0,0,0,0.16)]"
                                : "border-white/8 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.05]",
                            )}
                          >
                            <article className="flex flex-col gap-4 sm:flex-row sm:items-center">
                              <div className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-2 sm:w-44">
                                <div>
                                  <div className="relative aspect-square overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.03]">
                                    <ItemCoverImage
                                      src={yourCard.image}
                                      alt={yourItem.title}
                                      sizes="96px"
                                      imageClassName="transition-transform duration-500 group-hover:scale-105"
                                    />
                                  </div>
                                  <span className="mt-1.5 block truncate text-xs text-white/54">Ваше</span>
                                </div>
                                <ArrowLeftRight className="h-4 w-4 justify-self-center text-teal-200/70" />
                                <div>
                                  <div className="relative aspect-square overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.03]">
                                    <ItemCoverImage
                                      src={theirCard.image}
                                      alt={theirItem.title}
                                      sizes="96px"
                                      imageClassName="transition-transform duration-500 group-hover:scale-105"
                                    />
                                  </div>
                                  <span className="mt-1.5 block truncate text-xs text-white/54">Взамен</span>
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="flex items-center gap-1.5 text-xs text-white/60">
                                    <UserRound className="h-3.5 w-3.5" />
                                    {partner?.name ?? "Участник Menarium"}
                                  </span>
                                  <Badge variant={presentation.variant}>{presentation.label}</Badge>
                                </div>
                                <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-white">
                                  {yourItem.title}
                                  <span className="mx-2 text-teal-200/55">↔</span>
                                  {theirItem.title}
                                </h3>
                                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-white/60">
                                  {presentation.description}
                                </p>
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
                          className="rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          ← Назад
                        </Link>
                      ) : null}
                      <span className="text-xs text-white/35">
                        {page} из {exchangeTotalPages}
                      </span>
                      {exchangeHasMore ? (
                        <Link
                          href={exchangeHref(activeTab, undefined, activeFilter, page + 1)}
                          className="rounded-[14px] bg-gradient-to-r from-blue-500 to-teal-400 px-4 py-2.5 text-sm font-medium text-white"
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
                    "scroll-mt-24 border border-white/10 p-4 sm:p-5 lg:order-2 lg:sticky lg:top-24",
                    params.swap ? "order-1" : "order-2",
                  )}
                >
                  {selectedSwap && selectedTheirItem && selectedYourItem && selectedTheirCard && selectedYourCard && selectedStatus ? (
                    <>
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-500/20 to-teal-400/15">
                            <MessageCircle className="h-5 w-5 text-teal-200" />
                          </div>
                          <div className="min-w-0">
                            <h2 className="truncate font-semibold">
                              {selectedPartner?.name ?? "Участник Menarium"}
                            </h2>
                            <p className="mt-0.5 text-xs text-white/56">Обсуждение обмена</p>
                          </div>
                        </div>
                        <Badge variant={selectedStatus.variant} className="shrink-0">
                          {selectedStatus.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-stretch gap-2 rounded-[20px] border border-white/8 bg-white/[0.025] p-3">
                        <div className="min-w-0">
                          <div className="relative aspect-[4/3] overflow-hidden rounded-[13px] bg-white/[0.03]">
                            <ItemCoverImage
                              src={selectedYourCard.image}
                              alt={selectedYourItem.title}
                              sizes="160px"
                              priority
                            />
                          </div>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/56">Вы отдаёте</p>
                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-white/75">{selectedYourItem.title}</p>
                        </div>
                        <ArrowLeftRight className="h-4 w-4 self-center justify-self-center text-teal-200/75" />
                        <div className="min-w-0">
                          <div className="relative aspect-[4/3] overflow-hidden rounded-[13px] bg-white/[0.03]">
                            <ItemCoverImage
                              src={selectedTheirCard.image}
                              alt={selectedTheirItem.title}
                              sizes="160px"
                              priority
                            />
                          </div>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/56">Вы получаете</p>
                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-white/75">{selectedTheirItem.title}</p>
                        </div>
                      </div>

                      <p className="my-4 rounded-[16px] border border-blue-300/15 bg-blue-400/[0.055] px-4 py-3 text-sm leading-5 text-white/60">
                        {selectedStatus.description}
                      </p>

                      {selectedSwap.status === SwapStatus.PENDING ? (
                        <p className="-mt-1 mb-4 flex items-center gap-2 text-xs text-white/58">
                          <Clock3 className="h-3.5 w-3.5 text-amber-200/65" />
                          Ответ до {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(selectedSwap.expiresAt)}
                        </p>
                      ) : null}

                      <DealProgress status={selectedSwap.status} />

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
                        messages={selectedMessages}
                        nextCursor={selectedMessagePage.nextCursor}
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
                              <p className="mt-1 text-xs leading-4 text-white/45">
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

                      <a href="#exchange-list" className="mt-4 block text-center text-xs text-white/56 hover:text-white/78 lg:hidden">
                        Вернуться к списку ↑
                      </a>
                    </>
                  ) : (
                    <div className="py-12 text-center">
                      <MessageCircle className="mx-auto h-8 w-8 text-white/38" />
                      <h2 className="mt-4 font-semibold">Выбери обмен</h2>
                      <p className="mt-2 text-sm text-white/60">Здесь появятся детали, действия и чат.</p>
                    </div>
                  )}
                </GlassCard>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
