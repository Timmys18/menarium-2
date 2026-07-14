import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ItemStatus, SwapStatus, UserStatus } from "@prisma/client";
import type { Metadata } from "next";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { GlassCard } from "@/components/menarium/card";
import { ItemCard } from "@/components/menarium/item-card";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { prisma } from "@/lib/prisma";
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

  const [items, completedSwaps, block] = await Promise.all([
    prisma.item.findMany({
      where: { ownerId: id, status: ItemStatus.ACTIVE },
      include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
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
  ]);

  const cards = items.map((item) => toItemCardView(serializeItem(item)));
  const isSelf = viewerId === id;

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

          <div>
            <h2 className="mb-4 text-2xl font-semibold">Объявления</h2>
            {cards.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                  <ItemCard key={card.id} {...card} />
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
