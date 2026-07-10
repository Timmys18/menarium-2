import { ItemCoverImage } from "@/components/menarium/item-cover-image";
import { SwapStatus } from "@prisma/client";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { pickMutualPendingSwapIds } from "@/features/exchange/matches";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { loginHref } from "@/lib/utils";
import { DealMessageForm, ExchangeActionPanel } from "./exchange-controls";
import { ExchangeChatRefresh } from "./exchange-chat-refresh";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ swap?: string; tab?: string; filter?: string; page?: string }>;
};

const EXCHANGE_PAGE_SIZE = 30;

type ExchangeTab = "incoming" | "outgoing" | "matches";

function exchangeHref(tab: ExchangeTab, swapId?: string, filter: ExchangeFilter = "active", page?: number) {
  const search = new URLSearchParams();
  search.set("tab", tab);
  search.set("filter", filter);
  if (swapId) search.set("swap", swapId);
  if (page && page > 1) search.set("page", String(page));
  return `/exchange?${search.toString()}`;
}

type ExchangeFilter = "active" | "history";

const ACTIVE_STATUSES: SwapStatus[] = [SwapStatus.PENDING, SwapStatus.ACCEPTED];
const HISTORY_STATUSES: SwapStatus[] = [SwapStatus.DECLINED, SwapStatus.CANCELLED, SwapStatus.COMPLETED];

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

const statusLabels: Record<SwapStatus, string> = {
  PENDING: "Ожидает",
  ACCEPTED: "Принят",
  DECLINED: "Отклонен",
  COMPLETED: "Завершен",
  CANCELLED: "Отменен",
};

export default async function ExchangePage({ searchParams }: Props) {
  const userId = await getCurrentUserId();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const swapWhere = userId ? { OR: [{ senderId: userId }, { receiverId: userId }] } : undefined;

  const [swapsPage, totalSwaps, pendingForMatches, requestedSwapById] = userId
    ? await Promise.all([
        prisma.swapRequest.findMany({
          where: swapWhere,
          include: swapInclude,
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * EXCHANGE_PAGE_SIZE,
          take: EXCHANGE_PAGE_SIZE,
        }),
        prisma.swapRequest.count({ where: swapWhere }),
        prisma.swapRequest.findMany({
          where: { ...swapWhere, status: SwapStatus.PENDING },
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
              where: { id: params.swap, ...swapWhere },
              include: swapInclude,
            })
          : Promise.resolve(null),
      ])
    : [[], 0, [], null];

  const swaps =
    requestedSwapById && !swapsPage.some((entry) => entry.id === requestedSwapById.id)
      ? [requestedSwapById, ...swapsPage]
      : swapsPage;
  const exchangeHasMore = page * EXCHANGE_PAGE_SIZE < totalSwaps;
  const exchangeTotalPages = Math.max(1, Math.ceil(totalSwaps / EXCHANGE_PAGE_SIZE));

  const pendingRows = pendingForMatches.map((swap) => ({
    id: swap.id,
    senderId: swap.senderId,
    receiverId: swap.receiverId,
    senderItemId: swap.senderItemId,
    receiverItemId: swap.receiverItemId,
  }));
  const mutualPendingIds = userId ? pickMutualPendingSwapIds(pendingRows, userId) : new Set<string>();
  const requestedSwapEarly = params.swap ? swaps.find((swap) => swap.id === params.swap) : undefined;
  const activeFilter: ExchangeFilter =
    params.filter === "history"
      ? "history"
      : params.filter === "active"
        ? "active"
        : requestedSwapEarly && HISTORY_STATUSES.includes(requestedSwapEarly.status)
          ? "history"
          : "active";
  const statusFilter = activeFilter === "active" ? ACTIVE_STATUSES : HISTORY_STATUSES;

  const incoming = userId
    ? swaps.filter((swap) => swap.receiverId === userId && statusFilter.includes(swap.status))
    : [];
  const outgoing = userId
    ? swaps.filter((swap) => swap.senderId === userId && statusFilter.includes(swap.status))
    : [];
  const matches = swaps.filter(
    (swap) =>
      statusFilter.includes(swap.status) &&
      (mutualPendingIds.has(swap.id) ||
        swap.status === SwapStatus.ACCEPTED ||
        swap.status === SwapStatus.COMPLETED),
  );
  const explicitTab: ExchangeTab | null =
    params.tab === "outgoing" || params.tab === "matches" || params.tab === "incoming"
      ? params.tab
      : null;

  // Определяем, в каких вкладках реально присутствует запрошенный swap,
  // чтобы deep-link из уведомления открывал ту вкладку, где обмен виден.
  const requestedSwap = params.swap ? swaps.find((swap) => swap.id === params.swap) : undefined;
  const tabsForRequested: ExchangeTab[] = requestedSwap
    ? ([
        matches.some((s) => s.id === requestedSwap.id) ? "matches" : null,
        incoming.some((s) => s.id === requestedSwap.id) ? "incoming" : null,
        outgoing.some((s) => s.id === requestedSwap.id) ? "outgoing" : null,
      ].filter(Boolean) as ExchangeTab[])
    : [];

  const activeTab: ExchangeTab =
    explicitTab && (!requestedSwap || tabsForRequested.includes(explicitTab))
      ? explicitTab
      : (tabsForRequested[0] ?? explicitTab ?? "incoming");

  const tabSwaps =
    activeTab === "incoming" ? incoming : activeTab === "outgoing" ? outgoing : matches;
  const selectedSwap =
    (requestedSwap && tabSwaps.some((entry) => entry.id === requestedSwap.id) ? requestedSwap : undefined) ??
    tabSwaps[0] ??
    matches[0] ??
    incoming[0] ??
    outgoing[0];

  if (selectedSwap && userId) {
    // Отмечаем входящие сообщения этого чата прочитанными при открытии страницы.
    await prisma.dealMessage.updateMany({
      where: { swapId: selectedSwap.id, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
  }

  const selectedMessages = selectedSwap
    ? await prisma.dealMessage.findMany({
        where: { swapId: selectedSwap.id },
        orderBy: { createdAt: "asc" },
        take: 30,
      })
    : [];
  const visibleSwaps = tabSwaps;
  const firstSwapByTab = {
    incoming: incoming[0]?.id,
    outgoing: outgoing[0]?.id,
    matches: matches[0]?.id,
  };

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold md:text-5xl">
                Центр <span className="gradient-text">обменов</span>
              </h1>
              <p className="mt-3 text-white/60">Управляй входящими, исходящими и матчами в одном месте.</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="teal">Входящие {incoming.length}</Badge>
              <Badge variant="purple">Матчи {matches.length}</Badge>
              <Badge>Исходящие {outgoing.length}</Badge>
            </div>
          </div>

          {!userId ? (
            <EmptyState
              title="Войдите, чтобы управлять обменами"
              description="Центр обменов персональный: здесь будут входящие предложения, ваши исходящие заявки и реальные матчи."
              actionHref={loginHref("/exchange")}
              actionLabel="Войти"
            />
          ) : swaps.length === 0 ? (
            <EmptyState
              title="Обменов пока нет"
              description="Откройте каталог, найдите интересное объявление и предложите обмен своим предметом или услугой."
              actionHref="/catalog"
              actionLabel="Открыть каталог"
            />
          ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <GlassCard className="p-6">
              <div className="mb-6 flex gap-2 overflow-x-auto">
                {([
                  ["incoming", "Вам предложили", incoming.length],
                  ["outgoing", "Вы предложили", outgoing.length],
                  ["matches", "Матчи", matches.length],
                ] as const).map(([tab, label, count]) => (
                  <a
                    key={tab}
                    href={exchangeHref(tab, tab === activeTab ? selectedSwap?.id : firstSwapByTab[tab], activeFilter)}
                    className={`rounded-2xl px-5 py-3 text-sm font-medium ${
                      tab === activeTab
                        ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {label} {count}
                  </a>
                ))}
              </div>

              <div className="mb-6 flex gap-2">
                {([
                  ["active", "Активные"],
                  ["history", "История"],
                ] as const).map(([filter, label]) => (
                  <a
                    key={filter}
                    href={exchangeHref(activeTab, selectedSwap?.id, filter)}
                    className={`rounded-xl px-4 py-2 text-sm ${
                      activeFilter === filter
                        ? "bg-white/15 text-white"
                        : "bg-white/5 text-white/45 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </a>
                ))}
              </div>

              {visibleSwaps.length === 0 ? (
                <EmptyState
                  title={
                    activeTab === "incoming"
                      ? "Входящих предложений пока нет"
                      : activeTab === "outgoing"
                        ? "Исходящих предложений пока нет"
                        : "Матчей пока нет"
                  }
                  description="Когда появятся новые обмены, они будут в этой вкладке."
                  actionHref="/catalog"
                  actionLabel="Открыть каталог"
                />
              ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleSwaps.map((swap) => {
                  const isIncoming = swap.receiverId === userId;
                  const theirItem = serializeItem(isIncoming ? swap.senderItem : swap.receiverItem);
                  const yourItem = serializeItem(isIncoming ? swap.receiverItem : swap.senderItem);
                  const theirCard = toItemCardView(theirItem);
                  const partner = isIncoming ? swap.sender : swap.receiver;
                  return (
                    <a key={swap.id} href={exchangeHref(activeTab, swap.id, activeFilter)}>
                      <GlassCard className="group overflow-hidden">
                        <div className="relative h-52">
                          <ItemCoverImage
                            src={theirCard.image}
                            alt={theirCard.title}
                            imageClassName="transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute left-3 top-3 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs backdrop-blur-xl">
                            {partner?.name ?? "Пользователь Menarium"}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h3 className="text-sm text-white/95">{theirItem.title}</h3>
                            <Badge variant={swap.status === "ACCEPTED" ? "teal" : "glass"}>{statusLabels[swap.status]}</Badge>
                          </div>
                          <p className="text-xs text-white/45">За ваше: {yourItem.title}</p>
                        </div>
                      </GlassCard>
                    </a>
                  );
                })}
              </div>
              )}
              {exchangeTotalPages > 1 ? (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  {page > 1 ? (
                    <a
                      href={exchangeHref(activeTab, selectedSwap?.id, activeFilter, page - 1)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      ← Назад
                    </a>
                  ) : null}
                  <span className="text-sm text-white/45">
                    Страница {page} из {exchangeTotalPages}
                  </span>
                  {exchangeHasMore ? (
                    <a
                      href={exchangeHref(activeTab, selectedSwap?.id, activeFilter, page + 1)}
                      className="rounded-2xl bg-gradient-to-r from-teal-500 to-purple-500 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Показать ещё →
                    </a>
                  ) : null}
                </div>
              ) : null}
            </GlassCard>

            <GlassCard className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-purple-500/20">
                  <MessageCircle className="h-5 w-5 text-teal-300" />
                </div>
                <div>
                  <h2 className="font-semibold">Чат сделки</h2>
                  <p className="text-xs text-white/35">
                    {selectedSwap ? statusLabels[selectedSwap.status] : "Выберите обмен"}
                  </p>
                </div>
              </div>
              {selectedSwap ? (
                <ExchangeActionPanel
                  swapId={selectedSwap.id}
                  status={selectedSwap.status}
                  isSender={selectedSwap.senderId === userId}
                  isReceiver={selectedSwap.receiverId === userId}
                  senderCompleted={selectedSwap.senderCompleted}
                  receiverCompleted={selectedSwap.receiverCompleted}
                />
              ) : null}
              <div className="space-y-3">
                {selectedMessages.length > 0 ? (
                  selectedMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-2xl p-4 text-sm ${
                        message.senderId === userId
                          ? "ml-8 bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white/80"
                          : "bg-white/5 text-white/70"
                      }`}
                    >
                      {message.text}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/55">
                    Сообщений по этой сделке пока нет.
                  </div>
                )}
              </div>
              {selectedSwap ? (
                <DealMessageForm swapId={selectedSwap.id} disabled={selectedSwap.status !== SwapStatus.ACCEPTED} />
              ) : null}
              {selectedSwap && userId ? (
                <ExchangeChatRefresh enabled={selectedSwap.status === SwapStatus.ACCEPTED} />
              ) : null}
            </GlassCard>
          </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
