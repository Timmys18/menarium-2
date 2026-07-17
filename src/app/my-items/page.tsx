import Link from "next/link";
import { ItemStatus, SwapStatus } from "@prisma/client";
import {
  Archive,
  ArrowLeftRight,
  CirclePause,
  MapPin,
  PackageCheck,
  Plus,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";
import { toItemCardView } from "@/features/items/presenters";
import { expirePendingSwapOffers } from "@/features/exchange/expiration";
import { serializeItem } from "@/features/items/serializers";
import { prisma } from "@/lib/prisma";
import { cn, loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { ItemLifecycleAction } from "./item-lifecycle-action";

export const dynamic = "force-dynamic";

type ItemFilter = "active" | "deal" | "paused" | "history";
type SearchParams = {
  notice?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

const PAGE_SIZE = 24;
const LIVE_SWAP_STATUSES = [SwapStatus.PENDING, SwapStatus.ACCEPTED];
const RELATED_SWAP_STATUSES = [
  SwapStatus.PENDING,
  SwapStatus.ACCEPTED,
  SwapStatus.COMPLETED,
];

const filters = [
  {
    value: "active",
    status: ItemStatus.ACTIVE,
    label: "Опубликовано",
    description: "Видно в каталоге",
    icon: PackageCheck,
  },
  {
    value: "deal",
    status: ItemStatus.IN_DEAL,
    label: "В сделке",
    description: "Зарезервировано",
    icon: ArrowLeftRight,
  },
  {
    value: "paused",
    status: ItemStatus.PAUSED,
    label: "На паузе",
    description: "Скрыто от других",
    icon: CirclePause,
  },
  {
    value: "history",
    status: ItemStatus.ARCHIVED,
    label: "История",
    description: "Завершённые обмены",
    icon: Archive,
  },
] as const;

const statusPresentation = {
  [ItemStatus.ACTIVE]: {
    label: "Опубликовано",
    copy: "Объявление видно в каталоге и свайпе.",
    variant: "teal",
  },
  [ItemStatus.PAUSED]: {
    label: "На паузе",
    copy: "Объявление видишь только ты. Его можно изменить и вернуть в каталог.",
    variant: "purple",
  },
  [ItemStatus.IN_DEAL]: {
    label: "В сделке",
    copy: "Объявление защищено от новых предложений до завершения обмена.",
    variant: "gold",
  },
  [ItemStatus.ARCHIVED]: {
    label: "В истории",
    copy: "Объявление сохранено как часть завершённого обмена.",
    variant: "glass",
  },
} as const;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function filterHref(filter: ItemFilter, page?: number) {
  const search = new URLSearchParams({ status: filter });
  if (page && page > 1) search.set("page", String(page));
  return `/my-items?${search.toString()}`;
}

function itemSwapHref({
  id,
  status,
  direction,
}: {
  id: string;
  status: SwapStatus;
  direction: "incoming" | "outgoing";
}) {
  if (status === SwapStatus.COMPLETED) {
    return `/exchange?tab=matches&filter=history&swap=${encodeURIComponent(id)}`;
  }
  if (status === SwapStatus.ACCEPTED) {
    return `/exchange?tab=matches&swap=${encodeURIComponent(id)}`;
  }
  if (status === SwapStatus.PENDING) {
    return `/exchange?tab=${direction}&swap=${encodeURIComponent(id)}`;
  }
  return `/exchange?tab=${direction}&filter=history&swap=${encodeURIComponent(id)}`;
}

export default async function MyItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const userId = await getCurrentUserId();
  if (userId) await expirePendingSwapOffers(prisma, { userId });
  const groupedCounts = userId
    ? await prisma.item.groupBy({
        by: ["status"],
        where: { ownerId: userId },
        _count: { _all: true },
      })
    : [];
  const counts: Record<ItemStatus, number> = {
    [ItemStatus.ACTIVE]: 0,
    [ItemStatus.PAUSED]: 0,
    [ItemStatus.IN_DEAL]: 0,
    [ItemStatus.ARCHIVED]: 0,
  };
  for (const entry of groupedCounts) counts[entry.status] = entry._count._all;

  const requestedFilter = firstParam(params.status);
  const defaultFilter =
    filters.find((entry) => counts[entry.status] > 0)?.value ?? "active";
  const activeFilter =
    filters.find((entry) => entry.value === requestedFilter)?.value ?? defaultFilter;
  const activeStatus =
    filters.find((entry) => entry.value === activeFilter)?.status ?? ItemStatus.ACTIVE;
  const requestedPage = Math.max(1, Math.floor(Number(firstParam(params.page)) || 1));
  const totalItems = counts[activeStatus];
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const items = userId
    ? await prisma.item.findMany({
        where: { ownerId: userId, status: activeStatus },
        include: {
          images: true,
          sentSwaps: {
            where: { status: { in: RELATED_SWAP_STATUSES } },
            select: { id: true, status: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 3,
          },
          receivedSwaps: {
            where: { status: { in: RELATED_SWAP_STATUSES } },
            select: { id: true, status: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 3,
          },
          _count: {
            select: {
              sentSwaps: { where: { status: { in: LIVE_SWAP_STATUSES } } },
              receivedSwaps: { where: { status: { in: LIVE_SWAP_STATUSES } } },
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
    : [];

  const notice = firstParam(params.notice);
  const noticeCopy: Record<string, string> = {
    archived: "Объявление сохранено в истории завершённых обменов.",
    deleted: "Объявление удалено.",
    paused: "Объявление скрыто из каталога. Вернуть его можно в любой момент.",
    resumed: "Объявление снова опубликовано и доступно для предложений.",
  };

  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/60">
                Управление предложениями
              </p>
              <h1 className="text-4xl font-bold md:text-5xl">Мои объявления</h1>
              <p className="mt-3 max-w-2xl text-white/55">
                Публикуй, приостанавливай и возвращай объявления в каталог без потери данных.
              </p>
            </div>
            <MenariumLinkButton href="/new" className="self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              Создать объявление
            </MenariumLinkButton>
          </header>

          {notice && noticeCopy[notice] ? (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-[18px] border border-teal-300/25 bg-teal-300/[0.08] px-4 py-3.5 text-sm text-teal-50"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
              {noticeCopy[notice]}
            </div>
          ) : null}

          {!userId ? (
            <EmptyState
              title="Войдите, чтобы управлять объявлениями"
              description="После входа здесь появятся ваши опубликованные, приостановленные и завершённые предложения."
              actionHref={loginHref("/my-items")}
              actionLabel="Войти"
            />
          ) : (
            <>
              <nav
                aria-label="Состояния объявлений"
                className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4"
              >
                {filters.map((entry) => {
                  const Icon = entry.icon;
                  const selected = activeFilter === entry.value;
                  return (
                    <Link
                      key={entry.value}
                      href={filterHref(entry.value)}
                      aria-current={selected ? "page" : undefined}
                      className={cn(
                        "flex min-h-20 items-center gap-3 rounded-[20px] border px-4 py-3 transition",
                        selected
                          ? "border-blue-300/30 bg-gradient-to-br from-blue-400/[0.12] to-teal-300/[0.07] shadow-[0_12px_30px_rgba(0,0,0,0.15)]"
                          : "border-white/8 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.05]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]",
                          selected ? "bg-blue-400/18 text-teal-200" : "bg-white/[0.05] text-white/35",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{entry.label}</span>
                          <span className={cn("text-xs", selected ? "text-teal-200" : "text-white/30")}>
                            {counts[entry.status]}
                          </span>
                        </span>
                        <span className="mt-1 hidden text-xs text-white/35 sm:block">{entry.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </nav>

              {items.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => {
                    const publicItem = serializeItem(item);
                    const card = toItemCardView(publicItem);
                    const liveSwapCount = item._count.sentSwaps + item._count.receivedSwaps;
                    const relatedSwaps = [
                      ...item.sentSwaps.map((swap) => ({ ...swap, direction: "outgoing" as const })),
                      ...item.receivedSwaps.map((swap) => ({ ...swap, direction: "incoming" as const })),
                    ].sort((left, right) => {
                      const priority = {
                        [SwapStatus.ACCEPTED]: 0,
                        [SwapStatus.PENDING]: 1,
                        [SwapStatus.COMPLETED]: 2,
                        [SwapStatus.DECLINED]: 3,
                        [SwapStatus.CANCELLED]: 3,
                        [SwapStatus.EXPIRED]: 3,
                      } satisfies Record<SwapStatus, number>;
                      const byPriority = priority[left.status] - priority[right.status];
                      return byPriority || right.updatedAt.getTime() - left.updatedAt.getTime();
                    });
                    const relatedSwap = relatedSwaps[0];
                    const presentation = statusPresentation[item.status];

                    return (
                      <GlassCard
                        key={item.id}
                        role="article"
                        className="group flex h-full flex-col overflow-hidden border border-white/8"
                      >
                        <Link
                          href={`/item/${item.id}`}
                          className="relative block h-52 overflow-hidden bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300/70"
                        >
                          <ItemCoverImage
                            src={card.image}
                            alt={item.title}
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            imageClassName="transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b1019] to-transparent" />
                          <Badge variant={presentation.variant} className="absolute left-4 top-4">
                            {presentation.label}
                          </Badge>
                        </Link>

                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex items-center justify-between gap-3 text-xs text-white/35">
                            <span>{item.category}</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {item.city}
                            </span>
                          </div>
                          <Link href={`/item/${item.id}`} className="mt-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70">
                            <h2 className="line-clamp-2 text-xl font-semibold tracking-tight text-white">
                              {item.title}
                            </h2>
                          </Link>
                          <div className="mt-4 rounded-[16px] border border-white/7 bg-white/[0.025] px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                              Текущее состояние
                            </p>
                            <p className="mt-1.5 text-sm leading-5 text-white/55">{presentation.copy}</p>
                          </div>

                          {liveSwapCount > 0 ? (
                            <Link
                              href={relatedSwap ? itemSwapHref(relatedSwap) : "/exchange"}
                              className="mt-3 flex items-center justify-between rounded-[16px] border border-amber-300/18 bg-amber-300/[0.06] px-4 py-3 text-sm transition hover:bg-amber-300/[0.1]"
                            >
                              <span className="text-amber-100/80">
                                Активных предложений: {liveSwapCount}
                              </span>
                              <span className="text-xs text-amber-200">Открыть →</span>
                            </Link>
                          ) : null}

                          <div className="mt-auto flex flex-wrap gap-2 pt-5">
                            <MenariumLinkButton href={`/item/${item.id}`} variant="secondary" size="sm">
                              Открыть
                            </MenariumLinkButton>

                            {item.status === ItemStatus.ACTIVE || item.status === ItemStatus.PAUSED ? (
                              <MenariumLinkButton
                                href={`/item/${item.id}/edit`}
                                variant="ghost"
                                size="sm"
                              >
                                Изменить
                              </MenariumLinkButton>
                            ) : null}

                            {item.status === ItemStatus.ACTIVE && liveSwapCount === 0 ? (
                              <ItemLifecycleAction
                                itemId={item.id}
                                action="pause"
                                successHref="/my-items?status=paused&notice=paused"
                              />
                            ) : null}

                            {item.status === ItemStatus.PAUSED ? (
                              <ItemLifecycleAction
                                itemId={item.id}
                                action="resume"
                                successHref="/my-items?status=active&notice=resumed"
                              />
                            ) : null}

                            {(item.status === ItemStatus.IN_DEAL || item.status === ItemStatus.ARCHIVED) && relatedSwap ? (
                              <MenariumLinkButton
                                href={itemSwapHref(relatedSwap)}
                                size="sm"
                                className="flex-1"
                              >
                                {item.status === ItemStatus.IN_DEAL ? "Открыть сделку" : "История обмена"}
                              </MenariumLinkButton>
                            ) : null}
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title={
                    activeFilter === "active"
                      ? "Опубликованных объявлений пока нет"
                      : activeFilter === "deal"
                        ? "Сейчас ничего не участвует в сделке"
                        : activeFilter === "paused"
                          ? "На паузе пока ничего нет"
                          : "История объявлений пока пуста"
                  }
                  description={
                    activeFilter === "active"
                      ? "Создай объявление или верни в каталог одно из приостановленных."
                      : "Когда здесь появятся объявления, Menarium подскажет доступные действия."
                  }
                  actionHref={activeFilter === "paused" ? "/my-items?status=active" : "/new"}
                  actionLabel={activeFilter === "paused" ? "Открыть опубликованные" : "Создать объявление"}
                />
              )}

              {totalPages > 1 ? (
                <nav aria-label="Страницы объявлений" className="mt-8 flex items-center justify-center gap-3">
                  {page > 1 ? (
                    <Link
                      href={filterHref(activeFilter, page - 1)}
                      className="rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      ← Назад
                    </Link>
                  ) : null}
                  <span className="text-xs text-white/35">{page} из {totalPages}</span>
                  {page < totalPages ? (
                    <Link
                      href={filterHref(activeFilter, page + 1)}
                      className="rounded-[14px] bg-gradient-to-r from-blue-500 to-teal-400 px-4 py-2.5 text-sm font-medium text-white"
                    >
                      Дальше →
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
