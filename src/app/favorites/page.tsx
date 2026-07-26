import type { Metadata } from "next";
import Link from "next/link";
import { ItemStatus, Prisma, UserStatus } from "@prisma/client";
import { ArrowLeft, Heart, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCard } from "@/components/menarium/item-card";
import {
  buildInterestProfile,
  getRecommendationReasons,
  getTopDesiredLabels,
  getTopInterestLabels,
  scoreRecommendation,
  selectDiverseRecommendations,
} from "@/features/favorites/recommendations";
import {
  FavoriteCount,
  FavoriteItemSlot,
  FavoritesLiveState,
  FavoritesSavedContent,
} from "@/features/favorites/live-state";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { prisma } from "@/lib/prisma";
import { loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Избранное",
  description: "Сохранённые вещи и персональные рекомендации Menarium.",
  robots: { index: false, follow: false },
};

const FAVORITES_PAGE_SIZE = 18;

const itemInclude = {
  owner: { select: { id: true, name: true, city: true, image: true } },
  images: true,
  _count: { select: { favorites: true } },
} as const;

type FavoritesPageProps = {
  searchParams: Promise<{ page?: string }>;
};

function favoritesHref(page: number) {
  return page > 1 ? `/favorites?page=${page}` : "/favorites";
}

export default async function FavoritesPage({ searchParams }: FavoritesPageProps) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <AppShell>
        <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
          <div className="mx-auto max-w-5xl">
            <EmptyState
              icon={<Heart className="h-7 w-7" />}
              title="Соберите личную подборку"
              description="Войдите, чтобы сохранять интересные вещи и возвращаться к ним с любого устройства."
              actionHref={loginHref("/favorites")}
              actionLabel="Войти"
            />
          </div>
        </div>
      </AppShell>
    );
  }

  const params = await searchParams;
  const requestedPage = Math.max(1, Number(params.page) || 1);
  const favoriteWhere: Prisma.FavoriteWhereInput = {
    userId,
    item: {
      status: ItemStatus.ACTIVE,
      owner: { status: UserStatus.ACTIVE },
    },
  };

  const [total, preferenceFavorites, ownItems, blockRows] = await Promise.all([
    prisma.favorite.count({ where: favoriteWhere }),
    prisma.favorite.findMany({
      where: favoriteWhere,
      select: {
        itemId: true,
        item: { select: { title: true, category: true, type: true, city: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.item.findMany({
      where: { ownerId: userId, status: ItemStatus.ACTIVE },
      select: {
        title: true,
        category: true,
        type: true,
        city: true,
        desired: true,
        acceptsAnything: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / FAVORITES_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const favoriteRows = await prisma.favorite.findMany({
    where: favoriteWhere,
    include: { item: { include: itemInclude } },
    orderBy: [{ createdAt: "desc" }, { itemId: "desc" }],
    skip: (page - 1) * FAVORITES_PAGE_SIZE,
    take: FAVORITES_PAGE_SIZE,
  });

  const recentFavoriteSignals = preferenceFavorites.slice(0, 250);
  const interestProfile = buildInterestProfile([
    ...recentFavoriteSignals.map(({ item }) => ({
      ...item,
      source: "favorite" as const,
      weight: 2,
    })),
    ...ownItems.map((item) => ({
      ...item,
      source: "owned" as const,
      weight: 1,
    })),
  ]);
  const favoriteIds = preferenceFavorites.map((favorite) => favorite.itemId);
  const blockedOwnerIds = blockRows.map((block) =>
    block.blockerId === userId ? block.blockedId : block.blockerId,
  );
  const excludedOwnerIds = [userId, ...new Set(blockedOwnerIds)];
  const preferredCategories = [
    ...new Set(
      recentFavoriteSignals
        .map(({ item }) => item.category)
        .concat(ownItems.map((item) => item.category)),
    ),
  ];
  const preferredTypes = [
    ...new Set(
      recentFavoriteSignals
        .map(({ item }) => item.type)
        .concat(ownItems.map((item) => item.type)),
    ),
  ];
  const preferredCities = [
    ...new Set(
      recentFavoriteSignals
        .map(({ item }) => item.city)
        .concat(ownItems.map((item) => item.city)),
    ),
  ];
  const topDesiredTerms = getTopDesiredLabels(interestProfile, 6);
  const recommendationBase: Prisma.ItemWhereInput = {
    status: ItemStatus.ACTIVE,
    owner: { status: UserStatus.ACTIVE },
    ownerId: { notIn: excludedOwnerIds },
    ...(favoriteIds.length > 0 ? { id: { notIn: favoriteIds } } : {}),
  };
  const focusedPreferenceFilters: Prisma.ItemWhereInput[] = [
    ...(preferredCategories.length > 0 ? [{ category: { in: preferredCategories } }] : []),
    ...(preferredCities.length > 0 ? [{ city: { in: preferredCities } }] : []),
    ...topDesiredTerms.flatMap((term) => [
      { title: { contains: term, mode: "insensitive" as const } },
      { description: { contains: term, mode: "insensitive" as const } },
    ]),
  ];
  const preferenceFilters: Prisma.ItemWhereInput[] =
    focusedPreferenceFilters.length > 0
      ? focusedPreferenceFilters
      : preferredTypes.length > 0
        ? [{ type: { in: preferredTypes } }]
        : [];

  const matchedCandidates =
    preferenceFilters.length > 0
      ? await prisma.item.findMany({
          where: { ...recommendationBase, OR: preferenceFilters },
          include: itemInclude,
          orderBy: [{ favorites: { _count: "desc" } }, { updatedAt: "desc" }],
          take: 72,
        })
      : [];
  const fallbackCandidates =
    matchedCandidates.length < 12
      ? await prisma.item.findMany({
          where: {
            ...recommendationBase,
            ...(matchedCandidates.length > 0
              ? { id: { notIn: [...favoriteIds, ...matchedCandidates.map((item) => item.id)] } }
              : {}),
          },
          include: itemInclude,
          orderBy: [{ favorites: { _count: "desc" } }, { createdAt: "desc" }],
          take: 36,
        })
      : [];
  const recommendationMap = new Map(
    [...matchedCandidates, ...fallbackCandidates].map((item) => [item.id, item]),
  );
  const rankedRecommendations = [...recommendationMap.values()].sort((left, right) => {
      const scoreDifference =
        scoreRecommendation(right, interestProfile) - scoreRecommendation(left, interestProfile);
      if (scoreDifference !== 0) return scoreDifference;
      const popularityDifference = right._count.favorites - left._count.favorites;
      if (popularityDifference !== 0) return popularityDifference;
      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
  const recommendations = selectDiverseRecommendations(rankedRecommendations, 6);
  const topInterests = getTopInterestLabels(interestProfile);
  const preferenceLabels = [...new Set([...getTopDesiredLabels(interestProfile), ...topInterests])]
    .slice(0, 4);
  const currentHref = favoritesHref(page);

  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
        <div className="mx-auto max-w-[1500px]">
          <FavoritesLiveState
            key={`${total}:${favoriteIds.join(",")}`}
            initialTotal={total}
            initialFavoriteIds={favoriteIds}
          >
          <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-200/70">
                <Heart className="h-4 w-4 fill-current" />
                Личная подборка
              </p>
              <h1 className="type-page-title mt-3 text-4xl sm:text-5xl">
                Избранное
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48 sm:text-base">
                Сохраняйте варианты, сравнивайте без спешки и возвращайтесь к ним, когда будете готовы к обмену.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/48">
                Сохранено: <FavoriteCount />
              </span>
              <MenariumLinkButton href="/catalog" variant="secondary" size="sm">
                <ArrowLeft className="h-4 w-4" />
                В каталог
              </MenariumLinkButton>
            </div>
          </header>

          {total > 0 && ownItems.length === 0 ? (
            <GlassCard className="mb-7 flex flex-col gap-4 border border-teal-300/18 bg-gradient-to-r from-teal-300/[0.08] via-blue-400/[0.055] to-transparent p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200/70">Следующий шаг</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">Добавьте свою вещь для обмена</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                  Сохранённые варианты уже показывают, что вам интересно. Опубликуйте свою вещь, чтобы отправлять предложения обмена.
                </p>
              </div>
              <MenariumLinkButton href="/new" className="w-full shrink-0 sm:w-auto">
                <Plus className="h-4 w-4" />
                Добавить первую вещь
              </MenariumLinkButton>
            </GlassCard>
          ) : null}

          {favoriteRows.length > 0 ? (
            <FavoritesSavedContent
              emptyState={
                <EmptyState
                  icon={<Heart className="h-7 w-7" />}
                  title="Здесь появятся ваши находки"
                  description="Нажмите на сердце у интересной вещи — Menarium сохранит её здесь и начнёт точнее подбирать варианты."
                  actionHref="/catalog"
                  actionLabel="Посмотреть каталог"
                />
              }
            >
            <section aria-labelledby="saved-items-title">
              <div className="mb-4 flex items-end justify-between gap-4 px-1">
                <div>
                  <h2 id="saved-items-title" className="text-xl font-semibold tracking-[-0.02em]">
                    Сохранённые варианты
                  </h2>
                  <p className="mt-1 text-xs text-white/35">
                    Страница {page} из {totalPages}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {favoriteRows.map(({ item }, index) => {
                  const card = toItemCardView(serializeItem(item), item._count.favorites);
                  return (
                    <FavoriteItemSlot key={item.id} itemId={item.id}>
                      <ItemCard
                        {...card}
                        priority={index < 2}
                        returnHref={currentHref}
                        isFavorite
                        canFavorite
                      />
                    </FavoriteItemSlot>
                  );
                })}
              </div>
              {totalPages > 1 ? (
                <nav aria-label="Страницы избранного" className="mt-10 flex items-center justify-center gap-3">
                  {page > 1 ? (
                    <Link href={favoritesHref(page - 1)} className="rounded-[14px] border border-white/10 bg-white/[0.045] px-5 py-3 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white">
                      ← Назад
                    </Link>
                  ) : null}
                  <span className="text-sm text-white/42">{page} из {totalPages}</span>
                  {page < totalPages ? (
                    <Link href={favoritesHref(page + 1)} className="rounded-[14px] border border-blue-300/20 bg-gradient-to-r from-blue-500 to-teal-400 px-5 py-3 text-sm font-semibold text-white">
                      Дальше →
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </section>
            </FavoritesSavedContent>
          ) : (
            <EmptyState
              icon={<Heart className="h-7 w-7" />}
              title="Здесь появятся ваши находки"
              description="Нажмите на сердце у интересной вещи — Menarium сохранит её здесь и начнёт точнее подбирать варианты."
              actionHref="/catalog"
              actionLabel="Посмотреть каталог"
            />
          )}

          {page === 1 && recommendations.length > 0 ? (
            <section className="mt-16 border-t border-white/[0.07] pt-10" aria-labelledby="recommendations-title">
              <GlassCard className="mb-6 overflow-hidden border border-teal-300/12 bg-gradient-to-br from-teal-300/[0.065] to-blue-400/[0.035] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-teal-200/70">
                      <Sparkles className="h-4 w-4" />
                      Подборка для вас
                    </p>
                    <h2 id="recommendations-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                      Возможно, подойдёт
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">
                      {interestProfile.signalCount > 0
                        ? "Подбираем по сохранённым вариантам и вашим активным объявлениям."
                        : "Пока знакомимся с вашими интересами — показываем свежие и популярные варианты."}
                    </p>
                  </div>
                  {preferenceLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {preferenceLabels.map((interest) => (
                        <span key={interest} className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs text-white/58">
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </GlassCard>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((item) => {
                  const card = toItemCardView(serializeItem(item), item._count.favorites);
                  const reasons = getRecommendationReasons(item, interestProfile);
                  return (
                    <ItemCard
                      key={item.id}
                      {...card}
                      returnHref="/favorites"
                      canFavorite
                      recommendationReason={
                        reasons[0] ??
                        (item._count.favorites > 0
                          ? "Популярно у пользователей Menarium"
                          : "Свежий вариант для обмена")
                      }
                    />
                  );
                })}
              </div>
            </section>
          ) : null}
          </FavoritesLiveState>
        </div>
      </div>
    </AppShell>
  );
}
