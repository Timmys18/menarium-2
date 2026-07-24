import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ItemStatus, SwapStatus, UserStatus } from "@prisma/client";
import type { Metadata } from "next";
import { CalendarDays, MessageSquareQuote, PackageOpen, ShieldCheck, Star } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCard } from "@/components/menarium/item-card";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { buildReputationSummary } from "@/features/reputation/summary";
import { prisma } from "@/lib/prisma";
import { cn, loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { TrustActions } from "@/components/trust/trust-actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reviews?: string | string[] }>;
};

const REVIEWS_PAGE_SIZE = 8;

function reviewsHref(userId: string, page: number) {
  return page > 1 ? `/user/${userId}?reviews=${page}#reviews` : `/user/${userId}#reviews`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, status: UserStatus.ACTIVE },
    select: { name: true, city: true },
  });
  if (!user) return { title: "Пользователь не найден" };
  return {
    title: user.name ?? "Профиль пользователя",
    description: `Объявления и обмены пользователя Menarium${user.city ? ` · ${user.city}` : ""}.`,
  };
}

function getInitials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Оценка ${rating} из 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={index < rating ? "h-3.5 w-3.5 fill-amber-300 text-amber-300" : "h-3.5 w-3.5 text-white/16"}
        />
      ))}
    </span>
  );
}

export default async function PublicUserPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const viewerId = await getCurrentUserId();

  const user = await prisma.user.findFirst({
    where: { id, status: UserStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      city: true,
      image: true,
      createdAt: true,
      email: true,
      emailVerified: true,
    },
  });
  if (!user) notFound();

  const now = new Date();
  const requestedReviewsPage = Math.max(
    1,
    Math.floor(Number(Array.isArray(query.reviews) ? query.reviews[0] : query.reviews) || 1),
  );
  const [items, completedSwaps, block, ratingGroups] = await Promise.all([
    prisma.item.findMany({
      where: { ownerId: id, status: ItemStatus.ACTIVE },
      include: {
        owner: { select: { id: true, name: true, city: true, image: true } },
        images: true,
        _count: { select: { favorites: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.swapRequest.count({
      where: {
        status: SwapStatus.COMPLETED,
        OR: [{ senderId: id }, { receiverId: id }],
      },
    }),
    viewerId && viewerId !== id
      ? prisma.userBlock.findUnique({
          where: { blockerId_blockedId: { blockerId: viewerId, blockedId: id } },
          select: { blockerId: true },
        })
      : null,
    prisma.review.groupBy({
      by: ["rating"],
      where: { revieweeId: id, visibleAt: { lte: now } },
      _count: { _all: true },
    }),
  ]);

  const reputation = buildReputationSummary(
    completedSwaps,
    ratingGroups.map((group) => ({ rating: group.rating, count: group._count._all })),
  );
  const totalReviewPages = Math.max(
    1,
    Math.ceil(reputation.reviewCount / REVIEWS_PAGE_SIZE),
  );
  const reviewsPage = Math.min(requestedReviewsPage, totalReviewPages);
  const [reviews, favoriteRows] = await Promise.all([
    prisma.review.findMany({
      where: { revieweeId: id, visibleAt: { lte: now } },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewer: { select: { id: true, name: true, image: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (reviewsPage - 1) * REVIEWS_PAGE_SIZE,
      take: REVIEWS_PAGE_SIZE,
    }),
    viewerId && viewerId !== id && items.length > 0
      ? prisma.favorite.findMany({
          where: { userId: viewerId, itemId: { in: items.map((item) => item.id) } },
          select: { itemId: true },
        })
      : Promise.resolve([]),
  ]);
  const favoriteIds = new Set(favoriteRows.map((favorite) => favorite.itemId));
  const cards = items.map((item) => toItemCardView(serializeItem(item), item._count.favorites));
  const isSelf = viewerId === id;
  const reviewCount = reputation.reviewCount;
  const averageRating = reputation.averageRating;

  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
        <div className="mx-auto max-w-6xl space-y-5 sm:space-y-8">
          <GlassCard className="rounded-3xl p-5 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "Аватар"}
                  width={96}
                  height={96}
                  priority
                  className="h-20 w-20 rounded-2xl object-cover sm:h-24 sm:w-24"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-2xl font-bold sm:h-24 sm:w-24 sm:text-3xl">
                  {getInitials(user.name, user.email)}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">{user.name ?? "Пользователь Menarium"}</h1>
                <p className="mt-2 text-white/55">{user.city ?? "Город не указан"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="teal">{completedSwaps} завершённых обменов</Badge>
                  {reviewCount > 0 && averageRating ? (
                    <Badge variant="gold">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {averageRating.toFixed(1)} · {reviewCount} отзывов
                    </Badge>
                  ) : (
                    <Badge>{reputation.label}</Badge>
                  )}
                  <Badge>{cards.length} активных объявлений</Badge>
                  {user.emailVerified ? (
                    <Badge variant="teal">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Email подтверждён
                    </Badge>
                  ) : null}
                  <Badge>
                    <CalendarDays className="h-3.5 w-3.5" />
                    С нами с{" "}
                    {new Intl.DateTimeFormat("ru-RU", {
                      month: "long",
                      year: "numeric",
                    }).format(user.createdAt)}
                  </Badge>
                  {isSelf ? <Badge variant="purple">Это ваш профиль</Badge> : null}
                </div>
              </div>
              {isSelf ? (
                <MenariumLinkButton href="/profile/edit" variant="secondary" size="sm" className="w-full sm:w-auto">
                  Редактировать
                </MenariumLinkButton>
              ) : viewerId ? (
                <TrustActions
                  targetType="USER"
                  targetId={id}
                  userId={id}
                  initialBlocked={Boolean(block)}
                />
              ) : null}
            </div>
          </GlassCard>

          <section
            id="reputation"
            aria-labelledby="reputation-title"
            className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]"
          >
            <GlassCard className="overflow-hidden border border-amber-300/12 bg-gradient-to-br from-amber-300/[0.075] via-white/[0.025] to-teal-300/[0.045] p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-amber-100/55">
                Подтверждённая история
              </p>
              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-end gap-3">
                    <p className="text-5xl font-semibold tracking-[-0.06em] text-white">
                      {averageRating?.toFixed(1) ?? "—"}
                    </p>
                    <p className="pb-1.5 text-sm text-white/38">
                      {reviewCount > 0 ? "из 5" : "нет оценок"}
                    </p>
                  </div>
                  <h2 id="reputation-title" className="mt-4 text-xl font-semibold">
                    {reputation.label}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-5 text-white/48">
                    {reputation.description}
                  </p>
                </div>
                {reviewCount > 0 ? (
                  <ReviewStars rating={Math.round(averageRating ?? 0)} />
                ) : (
                  <ShieldCheck className="h-8 w-8 text-white/22" />
                )}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/8 pt-5">
                {[
                  ["Обменов", completedSwaps],
                  ["Отзывов", reviewCount],
                  ["Оценок 4–5", reputation.positivePercentage !== null ? `${reputation.positivePercentage}%` : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[15px] border border-white/7 bg-black/10 px-3 py-3">
                    <p className="text-lg font-semibold text-white/88">{value}</p>
                    <p className="mt-0.5 text-[11px] text-white/35">{label}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="border border-white/8 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.17em] text-white/32">
                    Распределение оценок
                  </p>
                  <p className="mt-2 text-sm leading-5 text-white/48">
                    Видны все опубликованные отзывы, а не только лучшие.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 shrink-0 text-teal-200/65" />
              </div>
              <div className="mt-5 space-y-2.5">
                {([5, 4, 3, 2, 1] as const).map((rating) => {
                  const count = reputation.distribution[rating];
                  const width = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                  return (
                    <div key={rating} className="grid grid-cols-[28px_1fr_28px] items-center gap-3">
                      <span className="text-xs text-white/48">{rating}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-white/[0.055]">
                        <span
                          className={cn(
                            "block h-full rounded-full",
                            rating >= 4
                              ? "bg-gradient-to-r from-amber-300 to-teal-300"
                              : "bg-white/25",
                          )}
                          style={{ width: `${width}%` }}
                        />
                      </span>
                      <span className="text-right text-xs text-white/32">{count}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 border-t border-white/7 pt-4 text-xs leading-5 text-white/34">
                Оценку можно оставить только после обмена, подтверждённого обеими сторонами.
                Отзывы публикуются после ответа партнёра или окончания слепого периода.
              </p>
            </GlassCard>
          </section>

          {reviews.length > 0 ? (
            <section id="reviews" aria-labelledby="public-reviews-title" className="scroll-mt-24">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/60">
                    Только завершённые сделки
                  </p>
                  <h2 id="public-reviews-title" className="mt-2 text-2xl font-semibold">
                    Отзывы партнёров
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{averageRating?.toFixed(1)}</p>
                  <p className="text-xs text-white/35">из 5</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {reviews.map((review) => (
                  <GlassCard key={review.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {review.reviewer.image ? (
                          <Image
                            src={review.reviewer.image}
                            alt=""
                            width={40}
                            height={40}
                            className="h-10 w-10 shrink-0 rounded-[13px] object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/[0.055] text-white/50">
                            <MessageSquareQuote className="h-4 w-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <Link href={`/user/${review.reviewer.id}`} className="block truncate text-sm font-semibold text-white/82 hover:text-teal-200">
                            {review.reviewer.name ?? "Участник Menarium"}
                          </Link>
                          <time dateTime={review.createdAt.toISOString()} className="mt-0.5 block text-xs text-white/32">
                            {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(review.createdAt)}
                          </time>
                        </div>
                      </div>
                      <ReviewStars rating={review.rating} />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-white/58">
                      {review.comment || "Обмен завершён без дополнительного комментария."}
                    </p>
                  </GlassCard>
                ))}
              </div>
              {totalReviewPages > 1 ? (
                <nav
                  aria-label="Страницы отзывов"
                  className="mt-6 flex items-center justify-center gap-3"
                >
                  {reviewsPage > 1 ? (
                    <Link
                      href={reviewsHref(id, reviewsPage - 1)}
                      className="rounded-[14px] border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      ← Новее
                    </Link>
                  ) : null}
                  <span className="text-xs text-white/35">
                    {reviewsPage} из {totalReviewPages}
                  </span>
                  {reviewsPage < totalReviewPages ? (
                    <Link
                      href={reviewsHref(id, reviewsPage + 1)}
                      className="rounded-[14px] border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      Старее →
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </section>
          ) : null}

          <div>
            <h2 className="mb-4 text-2xl font-semibold">Объявления</h2>
            {cards.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {cards.map((card) => (
                  <ItemCard
                    key={card.id}
                    {...card}
                    isFavorite={favoriteIds.has(card.id)}
                    canFavorite={Boolean(viewerId && viewerId !== id && !block)}
                    favoriteLoginHref={!viewerId ? loginHref(`/user/${id}`) : undefined}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<PackageOpen className="h-7 w-7" />}
                title={isSelf ? "Покажите свою первую вещь" : "Активных вещей пока нет"}
                description={
                  isSelf
                    ? "Добавьте вещь, которую готовы обменять. Хорошие фото и честное описание быстрее находят подходящую пару."
                    : "Загляните позже: здесь появятся вещи, которые пользователь готов обменять."
                }
                actionHref={isSelf ? "/new" : undefined}
                actionLabel={isSelf ? "Добавить вещь" : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
