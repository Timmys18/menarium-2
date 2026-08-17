import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ItemStatus, Prisma, SwapStatus, UserStatus } from "@prisma/client";
import {
  ArrowLeft,
  ArrowRightLeft,
  ChevronRight,
  Globe2,
  MapPin,
  MessageCircle,
  Package,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard, SurfaceCard } from "@/components/menarium/card";
import { FavoriteButton } from "@/components/menarium/favorite-button";
import { ItemCard } from "@/components/menarium/item-card";
import {
  buildInterestProfile,
  getRecommendationReasons,
  getRelatedItemReason,
  getTopDesiredLabels,
  scoreRecommendation,
  selectDiverseRecommendations,
} from "@/features/favorites/recommendations";
import { parseCatalogReturnHref } from "@/features/items/catalog-url";
import { serializeItem } from "@/features/items/serializers";
import { itemWantedLabel, toItemCardView } from "@/features/items/presenters";
import { canInteractWithItem, visibleItemWhere } from "@/features/items/visibility";
import { buildReputationSummary } from "@/features/reputation/summary";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/server/admin";
import { getCurrentUserIdentity } from "@/server/session";
import { loginHref } from "@/lib/utils";
import { ExchangeProposal } from "./exchange-proposal";
import { ItemChatPanel } from "./item-chat-panel";
import { ItemImageGallery } from "./item-image-gallery";
import { itemStatusLabels } from "@/features/items/status-labels";
import { DeleteItemButton } from "./owner-actions";
import { RecentlyViewedTracker } from "./recently-viewed-tracker";
import { TrustActions } from "@/components/trust/trust-actions";
import { loadItemThreadMessagePage } from "@/features/chat/message-pages";
import { markItemThreadRead } from "@/features/chat/read-state";
import { serializeItemThreadMessage } from "@/features/chat/serializers";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    thread?: string | string[];
    from?: string | string[];
    created?: string | string[];
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const item = await prisma.item.findFirst({
    where: { id, status: ItemStatus.ACTIVE, owner: { status: UserStatus.ACTIVE } },
    select: { title: true, description: true },
  });
  if (!item) return { title: "Объявление не найдено" };
  return {
    title: item.title,
    description: item.description.slice(0, 160),
  };
}

export const dynamic = "force-dynamic";

export default async function ItemPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const requestedThread = Array.isArray(query.thread) ? query.thread[0] : query.thread;
  const justCreated = (Array.isArray(query.created) ? query.created[0] : query.created) === "1";
  const returnHref = parseCatalogReturnHref(query.from) ?? "/catalog";
  const identity = await getCurrentUserIdentity();
  const userId = identity?.id ?? null;
  const viewerIsAdmin = Boolean(identity && isAdminEmail(identity.email));
  const viewer = identity ? { id: identity.id, isAdmin: viewerIsAdmin } : null;
  const itemInclude = {
    owner: {
      select: {
        id: true,
        name: true,
        city: true,
        image: true,
        emailVerified: true,
        createdAt: true,
      },
    },
    images: true,
    _count: { select: { favorites: true } },
  } as const;
  let item = await prisma.item.findFirst({
    where: visibleItemWhere(id, viewer),
    include: itemInclude,
  });

  // Участник существующего чата сохраняет доступ к истории после архивации
  // объявления, но не получает права на новые действия с ним.
  if (!item && userId && requestedThread && requestedThread !== "open") {
    item = await prisma.item.findFirst({
      where: {
        id,
        threads: {
          some: {
            id: requestedThread,
            OR: [{ buyerId: userId }, { ownerId: userId }],
          },
        },
      },
      include: itemInclude,
    });
  }

  if (!item) notFound();

  const publicItem = serializeItem(item);
  const card = toItemCardView(publicItem, item._count.favorites);
  const wanted = itemWantedLabel(publicItem);
  const itemHref =
    returnHref === "/catalog"
      ? `/item/${publicItem.id}`
      : `/item/${publicItem.id}?from=${encodeURIComponent(returnHref)}`;
  const chatHref = `${itemHref}${itemHref.includes("?") ? "&" : "?"}thread=open`;
  const createForExchangeHref = `/new?returnTo=${encodeURIComponent(`/item/${publicItem.id}`)}`;
  const isOwner = Boolean(userId && publicItem.owner?.id === userId);
  const canInteract = canInteractWithItem(item.status, viewerIsAdmin);
  const showPublishedSuccess = justCreated && isOwner && item.status === ItemStatus.ACTIVE;
  const ownerId = publicItem.owner?.id;
  const [blocks, ownerCompletedSwaps, ownerRatingGroups] = await Promise.all([
    userId && ownerId && !isOwner
      ? prisma.userBlock.findMany({
          where: {
            OR: [
              { blockerId: userId, blockedId: ownerId },
              { blockerId: ownerId, blockedId: userId },
            ],
          },
          select: { blockerId: true },
        })
      : Promise.resolve([]),
    ownerId
      ? prisma.swapRequest.count({
          where: {
            status: SwapStatus.COMPLETED,
            OR: [{ senderId: ownerId }, { receiverId: ownerId }],
          },
        })
      : Promise.resolve(0),
    ownerId
      ? prisma.review.groupBy({
          by: ["rating"],
          where: { revieweeId: ownerId, visibleAt: { lte: new Date() } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);
  const ownerReputation = buildReputationSummary(
    ownerCompletedSwaps,
    ownerRatingGroups.map((group) => ({ rating: group.rating, count: group._count._all })),
  );
  const communicationBlocked = blocks.length > 0;
  const viewerBlockedOwner = blocks.some((block) => block.blockerId === userId);
  const [favorite, userItems, recentFavorites, recommendationBlockRows] = await Promise.all([
    userId && !isOwner && canInteract && !communicationBlocked
      ? prisma.favorite.findUnique({
          where: { userId_itemId: { userId, itemId: publicItem.id } },
          select: { itemId: true },
        })
      : Promise.resolve(null),
    userId && !isOwner && canInteract && !communicationBlocked
      ? prisma.item.findMany({
          where: { ownerId: userId, status: ItemStatus.ACTIVE, id: { not: publicItem.id } },
          select: {
            id: true,
            title: true,
            category: true,
            type: true,
            city: true,
            desired: true,
            acceptsAnything: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    userId
      ? prisma.favorite.findMany({
          where: {
            userId,
            item: { status: ItemStatus.ACTIVE, owner: { status: UserStatus.ACTIVE } },
          },
          select: {
            itemId: true,
            item: {
              select: { title: true, category: true, type: true, city: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    userId
      ? prisma.userBlock.findMany({
          where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
          select: { blockerId: true, blockedId: true },
        })
      : Promise.resolve([]),
  ]);
  const relatedProfile = buildInterestProfile([
    {
      title: publicItem.title,
      category: publicItem.category,
      type: publicItem.type,
      city: publicItem.city,
      source: "favorite",
      weight: 3,
    },
    ...recentFavorites.map(({ item: favoriteItem }) => ({
      ...favoriteItem,
      source: "favorite" as const,
      weight: 2,
    })),
    ...userItems.map((userItem) => ({
      ...userItem,
      source: "owned" as const,
      weight: 1,
    })),
  ]);
  const excludedRecommendationOwnerIds = new Set<string>();
  if (ownerId) excludedRecommendationOwnerIds.add(ownerId);
  if (userId) excludedRecommendationOwnerIds.add(userId);
  for (const block of recommendationBlockRows) {
    excludedRecommendationOwnerIds.add(
      block.blockerId === userId ? block.blockedId : block.blockerId,
    );
  }
  const desiredTerms = getTopDesiredLabels(relatedProfile, 4);
  const relatedFilters: Prisma.ItemWhereInput[] = [
    { category: publicItem.category },
    { city: publicItem.city },
    { type: item.type },
    ...desiredTerms.flatMap((term) => [
      { title: { contains: term, mode: "insensitive" as const } },
      { description: { contains: term, mode: "insensitive" as const } },
    ]),
  ];
  const relatedCandidates = canInteract
    ? await prisma.item.findMany({
        where: {
          status: ItemStatus.ACTIVE,
          owner: { status: UserStatus.ACTIVE },
          id: { not: publicItem.id },
          ...(excludedRecommendationOwnerIds.size > 0
            ? { ownerId: { notIn: [...excludedRecommendationOwnerIds] } }
            : {}),
          OR: relatedFilters,
        },
        include: itemInclude,
        orderBy: [{ favorites: { _count: "desc" } }, { updatedAt: "desc" }],
        take: 36,
      })
    : [];
  const relatedItems = selectDiverseRecommendations(
    [...relatedCandidates].sort((left, right) => {
      const scoreDifference =
        scoreRecommendation(right, relatedProfile) -
        scoreRecommendation(left, relatedProfile);
      if (scoreDifference !== 0) return scoreDifference;
      const favoriteDifference = right._count.favorites - left._count.favorites;
      if (favoriteDifference !== 0) return favoriteDifference;
      return right.updatedAt.getTime() - left.updatedAt.getTime();
    }),
    3,
  );
  const favoriteIds = new Set(recentFavorites.map((entry) => entry.itemId));
  // Чат по объявлению доступен и покупателю, и владельцу.
  // - thread=open: покупатель начинает диалог (владельцу с самим собой нельзя);
  // - thread=<id>: открытие конкретной ветки — доступно обоим участникам.
  const chatViewerId =
    requestedThread && userId && (requestedThread !== "open" || (canInteract && !isOwner))
      ? userId
      : null;
  const thread = chatViewerId
    ? requestedThread === "open"
      ? await prisma.itemThread.findUnique({
            where: { itemId_buyerId: { itemId: publicItem.id, buyerId: chatViewerId } },
          })
      : await prisma.itemThread.findFirst({
          where: {
            id: requestedThread,
            itemId: publicItem.id,
            OR: [{ buyerId: chatViewerId }, { ownerId: chatViewerId }],
          },
        })
    : null;

  const showChatPanel = Boolean(
    chatViewerId &&
      (thread || (requestedThread === "open" && canInteract && !isOwner && !communicationBlocked)),
  );
  const canWriteItemChat = canInteract && !communicationBlocked;

  const itemMessagePage =
    thread && chatViewerId
      ? (
          await Promise.all([
            loadItemThreadMessagePage({ threadId: thread.id }),
            markItemThreadRead(chatViewerId, thread.id),
          ])
        )[0]
      : { messages: [], nextCursor: null };

  const itemChatMessages = itemMessagePage.messages.map(serializeItemThreadMessage);

  return (
    <AppShell>
      {userId && !isOwner && canInteract && !communicationBlocked ? (
        <RecentlyViewedTracker itemId={publicItem.id} />
      ) : null}
      <div className="page-enter min-h-screen px-4 pb-40 pt-20 sm:px-6 md:pb-32 md:pt-28">
        <div className="mx-auto max-w-6xl">
          <MenariumLinkButton href={returnHref} variant="ghost" size="sm" className="mb-4 sm:mb-6">
            <ArrowLeft className="h-4 w-4" />
            Назад в каталог
          </MenariumLinkButton>

          {showPublishedSuccess ? (
            <GlassCard className="mb-5 overflow-hidden border border-teal-300/20 bg-gradient-to-r from-teal-300/[0.12] via-blue-400/[0.08] to-transparent p-5 sm:mb-7 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-teal-300 text-[#06130f] shadow-[0_12px_30px_rgba(52,211,153,0.18)]">
                    <CheckCircle2 className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-100/72">Объявление опубликовано</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] sm:text-2xl">Теперь найдём встречный вариант</h2>
                    <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/62">
                      В свайпе уже можно выбрать чужую вещь и отправить первое предложение обмена.
                    </p>
                  </div>
                </div>
                <MenariumLinkButton href="/swipe" className="w-full shrink-0 sm:w-auto">
                  <ArrowRightLeft className="h-4 w-4" />
                  Найти вариант
                </MenariumLinkButton>
              </div>
            </GlassCard>
          ) : null}

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-7">
            <div className="lg:sticky lg:top-28">
              <GlassCard className="overflow-hidden rounded-[24px] sm:rounded-[32px]">
                <div className="relative">
                  <ItemImageGallery
                    images={publicItem.images.length > 0 ? publicItem.images : [{ id: "placeholder", url: card.image }]}
                    title={publicItem.title}
                    itemId={publicItem.id}
                  />
                </div>
              </GlassCard>
            </div>

            <div className="space-y-5">
              <GlassCard className="p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap gap-2">
                  <Badge variant="gradient">{publicItem.category}</Badge>
                  <Badge variant="glass">
                    <Package className="h-3 w-3" />
                    {publicItem.type === "SERVICE" ? "Услуга" : "Предмет"}
                  </Badge>
                  {publicItem.isOnline ? (
                    <Badge variant="teal">
                      <Globe2 className="h-3 w-3" />
                      Онлайн
                    </Badge>
                  ) : null}
                </div>

                <div className="flex items-start gap-3">
                  <h1 className="type-page-title min-w-0 flex-1 text-2xl sm:text-4xl">
                    {publicItem.title}
                  </h1>
                  {!isOwner && canInteract && !communicationBlocked ? (
                    <FavoriteButton
                      itemId={publicItem.id}
                      itemTitle={publicItem.title}
                      initialFavorite={Boolean(favorite)}
                      authenticated={Boolean(userId)}
                      loginHref={!userId ? loginHref(itemHref) : undefined}
                      showLabel
                      className="shrink-0"
                    />
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/66">
                  <span className="inline-flex items-center gap-1.5">
                    {publicItem.isOnline ? <Globe2 className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    {publicItem.isOnline ? `Онлайн · ${publicItem.city}` : publicItem.city}
                  </span>
                  {publicItem.owner?.id ? (
                    <Link
                      href={`/user/${publicItem.owner.id}`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-white/78 transition hover:bg-white/[0.045] hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
                    >
                      <UserRound className="h-4 w-4" />
                      {publicItem.owner.name ?? "Пользователь Менариум"}
                    </Link>
                  ) : null}
                </div>

                <div className="my-6 rounded-[20px] border border-blue-300/[0.16] bg-gradient-to-br from-blue-400/[0.10] to-teal-300/[0.045] p-4 sm:p-5">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/58">
                    <ArrowRightLeft className="h-4 w-4 text-teal-200/78" />
                    В обмен рассматривает
                  </div>
                  <p className="text-base font-medium leading-relaxed text-white/88 sm:text-lg">{wanted}</p>
                </div>

                <div
                  className={`flex flex-col gap-3 ${
                    !isOwner && canInteract && !communicationBlocked ? "hidden md:flex" : ""
                  }`}
                >
                  {isOwner ? (
                    item.status === ItemStatus.ACTIVE || item.status === ItemStatus.PAUSED ? (
                      <div className="flex-1 space-y-3">
                        {item.status === ItemStatus.PAUSED ? (
                          <div className="rounded-[16px] border border-amber-300/15 bg-amber-300/[0.07] px-4 py-3 text-sm text-amber-50/72">
                            Объявление на паузе: его видите только вы. Измените его здесь или верните в каталог из раздела «Мои вещи».
                          </div>
                        ) : null}
                        <MenariumLinkButton href={`/item/${publicItem.id}/edit`} className="w-full">
                          Редактировать объявление
                        </MenariumLinkButton>
                        <DeleteItemButton itemId={publicItem.id} />
                      </div>
                    ) : (
                      <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/62">
                        Объявление не опубликовано. Оно доступно вам для просмотра, но обмен и редактирование закрыты.
                      </div>
                    )
                  ) : !canInteract ? (
                    <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/62">
                      Объявление снято с публикации и недоступно для новых контактов.
                    </div>
                  ) : userId && !communicationBlocked ? (
                    <ExchangeProposal
                      receiverItemId={publicItem.id}
                      receiverTitle={publicItem.title}
                      userItems={userItems}
                    />
                  ) : userId ? (
                    <div className="flex-1 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/80">
                      Контакт с этим пользователем ограничен.
                    </div>
                  ) : (
                    <MenariumLinkButton href={loginHref(itemHref)} className="flex-1">
                      Войти и предложить обмен
                    </MenariumLinkButton>
                  )}
                  {!isOwner && canInteract && !communicationBlocked ? (
                    <MenariumLinkButton
                      href={userId ? chatHref : loginHref(chatHref)}
                      variant="secondary"
                      className="min-w-12 flex-1"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Написать
                    </MenariumLinkButton>
                  ) : null}
                </div>

                <div className="mt-5 flex items-start gap-2.5 border-t border-white/8 pt-5 text-sm leading-relaxed text-white/78">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300/72" />
                  Статус обмена виден обеим сторонам. Не передавайте коды и данные банковских карт в сообщениях.
                </div>

                <section className="mt-6 border-t border-white/8 pt-6" aria-labelledby="item-description-title">
                  <h2 id="item-description-title" className="text-lg font-semibold text-white/92">
                    Об объявлении
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-white/68">
                    {publicItem.description}
                  </p>
                </section>
              </GlassCard>

              <SurfaceCard className="p-5 sm:p-6">
                {publicItem.owner?.id ? (
                  <Link
                    href={`/user/${publicItem.owner.id}`}
                    className="group mb-5 block rounded-[18px] border border-white/8 bg-white/[0.025] p-3.5 transition hover:border-teal-300/18 hover:bg-teal-300/[0.04]"
                  >
                    <span className="flex items-center gap-3">
                      {publicItem.owner.image ? (
                        <Image
                          src={publicItem.owner.image}
                          alt=""
                          width={44}
                          height={44}
                          sizes="44px"
                          className="h-11 w-11 shrink-0 rounded-[14px] object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-sky-400/20 to-teal-300/14 text-teal-100/80">
                          <UserRound className="h-5 w-5" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-white/62">Владелец</span>
                        <span className="block truncate text-sm font-semibold text-white/86">
                          {publicItem.owner.name ?? "Пользователь Менариум"}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-teal-100/54 transition group-hover:text-teal-100/82">
                        Профиль
                        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>
                    </span>
                    <span className="mt-3 flex flex-wrap gap-2 border-t border-white/7 pt-3">
                      {ownerReputation.averageRating ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/12 bg-amber-300/[0.055] px-2.5 py-1 text-[11px] text-amber-100/70">
                          <Star className="h-3 w-3 fill-current" />
                          {ownerReputation.averageRating.toFixed(1)} · {ownerReputation.reviewCount} отзывов
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[11px] text-white/62">
                          {ownerReputation.label}
                        </span>
                      )}
                      <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[11px] text-white/62">
                        {ownerCompletedSwaps} завершённых обменов
                      </span>
                      {item.owner.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/12 bg-teal-300/[0.045] px-2.5 py-1 text-[11px] text-teal-100/65">
                          <ShieldCheck className="h-3 w-3" />
                          Email подтверждён
                        </span>
                      ) : null}
                    </span>
                  </Link>
                ) : null}

                <h2 className="mb-4 text-lg font-semibold">Детали</h2>
                <div className="divide-y divide-white/7 text-sm">
                  <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                    <span className="text-white/62">Город</span>
                    <span className="text-right text-white/82">{publicItem.city}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-white/62">Категория</span>
                    <span className="text-right text-white/82">{publicItem.category}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-white/62">Формат</span>
                    <span className="text-right text-white/82">
                      {publicItem.isOnline ? "Можно онлайн" : `Лично · ${publicItem.city}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                    <span className="text-white/62">Статус</span>
                    <span className="text-right font-medium text-teal-200/82">
                      {itemStatusLabels[publicItem.status as keyof typeof itemStatusLabels]}
                    </span>
                  </div>
                </div>
                {userId && !isOwner && ownerId && canInteract ? (
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <TrustActions
                      targetType="ITEM"
                      targetId={publicItem.id}
                      userId={ownerId}
                      initialBlocked={viewerBlockedOwner}
                    />
                  </div>
                ) : null}
              </SurfaceCard>
            </div>
          </div>
          {!showChatPanel && relatedItems.length > 0 ? (
            <section
              className="mt-10 border-t border-white/[0.07] pt-8 sm:mt-14 sm:pt-10"
              aria-labelledby="related-items-title"
            >
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200/62">
                    <Sparkles className="h-4 w-4" />
                    Продолжить поиск
                  </p>
                  <h2
                    id="related-items-title"
                    className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl"
                  >
                    Похожие варианты
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
                    Подборка учитывает эту вещь
                    {userId ? ", ваши сохранения и активные предложения." : " и близкие варианты в каталоге."}
                  </p>
                </div>
                <MenariumLinkButton href="/catalog" variant="ghost" size="sm" className="w-full sm:w-auto">
                  Весь каталог
                  <ChevronRight className="h-4 w-4" />
                </MenariumLinkButton>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {relatedItems.map((relatedItem) => {
                  const relatedCard = toItemCardView(
                    serializeItem(relatedItem),
                    relatedItem._count.favorites,
                  );
                  const personalReasons = getRecommendationReasons(
                    relatedItem,
                    relatedProfile,
                  );

                  return (
                    <ItemCard
                      key={relatedItem.id}
                      {...relatedCard}
                      returnHref={itemHref}
                      isFavorite={favoriteIds.has(relatedItem.id)}
                      canFavorite={Boolean(userId)}
                      favoriteLoginHref={!userId ? loginHref(itemHref) : undefined}
                      recommendationReason={getRelatedItemReason(
                        relatedItem,
                        item,
                        personalReasons,
                      )}
                    />
                  );
                })}
              </div>
            </section>
          ) : null}
          {showChatPanel && chatViewerId ? (
            <ItemChatPanel
              key={thread?.id ?? "open"}
              itemId={publicItem.id}
              initialThreadId={thread?.id ?? null}
              currentUserId={chatViewerId}
              messages={itemChatMessages}
              nextCursor={itemMessagePage.nextCursor}
              canWrite={canWriteItemChat}
              isOwner={isOwner}
            />
          ) : null}
          {!showChatPanel && !isOwner && canInteract && !communicationBlocked ? (
            <div className="mobile-action-dock fixed inset-x-3 z-40 mx-auto grid max-w-lg grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-[22px] border border-white/12 bg-[#090e16]/94 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:hidden">
              <MenariumLinkButton
                href={
                  userId
                    ? userItems.length > 0
                      ? "#exchange-proposal"
                      : createForExchangeHref
                    : loginHref(itemHref)
                }
                size="sm"
                className="min-w-0 px-3"
              >
                <ArrowRightLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {userId
                    ? userItems.length > 0
                      ? "Предложить обмен"
                      : "Добавить и обменять"
                    : "Войти и обменять"}
                </span>
              </MenariumLinkButton>
              <MenariumLinkButton
                href={userId ? chatHref : loginHref(chatHref)}
                variant="secondary"
                size="sm"
                className="min-w-11 px-3"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Написать</span>
              </MenariumLinkButton>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
