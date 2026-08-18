import Link from "next/link";
import { ItemStatus } from "@prisma/client";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/menarium/badge";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCard } from "@/components/menarium/item-card";
import { toItemCardView } from "@/features/items/presenters";
import { serializeItem } from "@/features/items/serializers";
import { prisma } from "@/lib/prisma";
import { cn, loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { ProfileNotice } from "./profile-notice";
import { ItemLifecycleAction } from "@/app/my-items/item-lifecycle-action";

export const dynamic = "force-dynamic";

type ItemFilter = "active" | "deal" | "paused" | "history";

const filters = [
  { value: "active", label: "Активные", status: ItemStatus.ACTIVE },
  { value: "deal", label: "В обмене", status: ItemStatus.IN_DEAL },
  { value: "paused", label: "На паузе", status: ItemStatus.PAUSED },
  { value: "history", label: "История", status: ItemStatus.ARCHIVED },
] as const;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    welcome?: string;
    verified?: string;
  }>;
}) {
  const params = await searchParams;
  const userId = await getCurrentUserId();
  const requested = firstParam(params.status);
  const activeFilter = (filters.some((entry) => entry.value === requested) ? requested : "active") as ItemFilter;
  const activeStatus = filters.find((entry) => entry.value === activeFilter)?.status ?? ItemStatus.ACTIVE;

  const [groups, items, user] = userId
    ? await Promise.all([
        prisma.item.groupBy({
          by: ["status"],
          where: { ownerId: userId },
          _count: { _all: true },
        }),
        prisma.item.findMany({
          where: { ownerId: userId, status: activeStatus },
          include: {
            images: true,
            owner: { select: { id: true, name: true, city: true, image: true } },
            _count: {
              select: {
                favorites: true,
                sentSwaps: { where: { status: { in: ["PENDING", "ACCEPTED"] } } },
                receivedSwaps: { where: { status: { in: ["PENDING", "ACCEPTED"] } } },
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 18,
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
      ])
    : [[], [], null];

  const counts: Record<ItemStatus, number> = {
    [ItemStatus.ACTIVE]: 0,
    [ItemStatus.PAUSED]: 0,
    [ItemStatus.IN_DEAL]: 0,
    [ItemStatus.ARCHIVED]: 0,
  };
  for (const entry of groups) counts[entry.status] = entry._count._all;

  if (!userId) {
    return (
      <EmptyState
        title="Войдите в личный кабинет"
        description="Здесь находятся ваши объявления, обмены, сообщения и настройки."
        actionHref={loginHref("/profile")}
        actionLabel="Войти"
      />
    );
  }

  return (
    <div className="space-y-5">
      {params.verified === "1" && user?.emailVerified ? (
        <ProfileNotice kind="verified" />
      ) : params.welcome === "1" ? (
        <ProfileNotice kind="welcome" />
      ) : null}

      <GlassCard className="border border-white/8 p-4 sm:p-5">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="type-kicker text-teal-200/55">Ваши вещи и услуги</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Мои объявления</h2>
          </div>
          <MenariumLinkButton href="/new" size="sm">Добавить</MenariumLinkButton>
        </header>

        <nav className="mt-5 grid grid-cols-2 gap-1 rounded-[18px] border border-white/7 bg-black/10 p-1 sm:grid-cols-4" aria-label="Статус объявлений">
          {filters.map((entry) => {
            const active = entry.value === activeFilter;
            return (
              <Link
                key={entry.value}
                href={entry.value === "active" ? "/profile" : `/profile?status=${entry.value}`}
                prefetch
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-[13px] px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70",
                  active ? "bg-white/[0.08] text-white" : "text-white/78 hover:bg-white/[0.045] hover:text-white",
                )}
              >
                {entry.label}
                <span className={active ? "text-teal-200" : "text-white/78"}>{counts[entry.status]}</span>
              </Link>
            );
          })}
        </nav>

        {items.length > 0 ? (
          <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => {
              const card = toItemCardView(serializeItem(item), item._count.favorites);
              const hasLiveSwap = item._count.sentSwaps + item._count.receivedSwaps > 0;
              return (
                <div key={item.id} className="relative min-w-0">
                  <ItemCard {...card} priority={index < 2} reserveTopRight />
                  <div className="absolute right-4 top-4 z-30 flex gap-2">
                    {item.status === ItemStatus.ACTIVE && !hasLiveSwap ? (
                      <ItemLifecycleAction
                        itemId={item.id}
                        action="pause"
                        successHref="/profile?status=paused"
                        compact
                      />
                    ) : item.status === ItemStatus.PAUSED ? (
                      <ItemLifecycleAction
                        itemId={item.id}
                        action="resume"
                        successHref="/profile"
                        compact
                      />
                    ) : null}
                    {(item.status === ItemStatus.ACTIVE || item.status === ItemStatus.PAUSED) ? (
                      <Link
                        href={`/item/${item.id}/edit`}
                        aria-label={`Редактировать «${item.title}»`}
                        className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-white/12 bg-[var(--surface-sunken)]/92 text-white/82 shadow-lg transition hover:bg-[#111925] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                  {item.status !== ItemStatus.ACTIVE ? (
                    <Badge
                      variant={item.status === ItemStatus.IN_DEAL ? "teal" : "glass"}
                      className="absolute bottom-4 left-4 z-20 bg-[var(--surface-sunken)]/86"
                    >
                      {item.status === ItemStatus.IN_DEAL
                        ? "В обмене"
                        : item.status === ItemStatus.PAUSED
                          ? "На паузе"
                          : "В истории"}
                    </Badge>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title={activeFilter === "active" ? "Объявлений пока нет" : `Раздел «${filters.find((entry) => entry.value === activeFilter)?.label}» пока пуст`}
              description={activeFilter === "active" ? "Добавьте вещь или услугу, чтобы начать обмениваться." : "Здесь появятся объявления с выбранным состоянием."}
              actionHref={activeFilter === "active" ? "/new" : "/profile"}
              actionLabel={activeFilter === "active" ? "Добавить объявление" : "Показать активные"}
            />
          </div>
        )}
      </GlassCard>
    </div>
  );
}
