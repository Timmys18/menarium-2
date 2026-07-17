import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ItemStatus, SwapStatus, UserStatus } from "@prisma/client";
import type { Metadata } from "next";
import { CalendarDays, MessageSquareQuote, ShieldCheck, Star } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { GlassCard } from "@/components/menarium/card";
import { ItemCard } from "@/components/menarium/item-card";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { prisma } from "@/lib/prisma";
import { loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { TrustActions } from "@/components/trust/trust-actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

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

export default async function PublicUserPage({ params }: Props) {
  const { id } = await params;
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
  const [items, completedSwaps, block, reviewSummary, reviews] = await Promise.all([
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
    prisma.review.aggregate({
      where: { revieweeId: id, visibleAt: { lte: now } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
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
      take: 12,
    }),
  ]);

  const favoriteRows =
    viewerId && viewerId !== id && items.length > 0
      ? await prisma.favorite.findMany({
          where: { userId: viewerId, itemId: { in: items.map((item) => item.id) } },
          select: { itemId: true },
        })
      : [];
  const favoriteIds = new Set(favoriteRows.map((favorite) => favorite.itemId));
  const cards = items.map((item) => toItemCardView(serializeItem(item), item._count.favorites));
  const isSelf = viewerId === id;
  const reviewCount = reviewSummary._count._all;
  const averageRating = reviewSummary._avg.rating;

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-6xl space-y-8">
          <GlassCard className="rounded-3xl p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "Аватар"}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-purple-600 text-3xl font-bold">
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
                    <Badge>Репутация формируется</Badge>
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
                <Link href="/profile/edit" className="text-sm text-teal-300 hover:underline">
                  Редактировать
                </Link>
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

          {reviews.length > 0 ? (
            <section aria-labelledby="public-reviews-title">
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
            </section>
          ) : null}

          <div>
            <h2 className="mb-4 text-2xl font-semibold">Объявления</h2>
            {cards.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              <GlassCard className="p-8 text-center text-white/55">
                {isSelf ? "У вас пока нет активных объявлений." : "У пользователя пока нет активных объявлений."}
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
