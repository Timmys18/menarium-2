import Image from "next/image";
import { SwapStatus } from "@prisma/client";
import { CheckCircle2, MessageCircle, RotateCcw, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { pickMutualPendingSwapIds } from "@/features/exchange/matches";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ swap?: string }>;
};

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
  const swaps = userId
    ? await prisma.swapRequest.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        include: swapInclude,
        orderBy: { updatedAt: "desc" },
        take: 60,
      })
    : [];
  const pendingRows = swaps
    .filter((swap) => swap.status === SwapStatus.PENDING)
    .map((swap) => ({
      id: swap.id,
      senderId: swap.senderId,
      receiverId: swap.receiverId,
      senderItemId: swap.senderItemId,
      receiverItemId: swap.receiverItemId,
    }));
  const mutualPendingIds = userId ? pickMutualPendingSwapIds(pendingRows, userId) : new Set<string>();
  const incoming = userId ? swaps.filter((swap) => swap.receiverId === userId) : [];
  const outgoing = userId ? swaps.filter((swap) => swap.senderId === userId) : [];
  const matches = swaps.filter(
    (swap) =>
      mutualPendingIds.has(swap.id) ||
      swap.status === SwapStatus.ACCEPTED ||
      swap.status === SwapStatus.COMPLETED,
  );
  const selectedSwap = swaps.find((swap) => swap.id === params.swap) ?? matches[0] ?? incoming[0] ?? outgoing[0];
  const selectedMessages = selectedSwap
    ? await prisma.dealMessage.findMany({
        where: { swapId: selectedSwap.id },
        orderBy: { createdAt: "asc" },
        take: 30,
      })
    : [];
  const visibleSwaps = [...incoming, ...outgoing.filter((swap) => !incoming.some((entry) => entry.id === swap.id))];

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
              actionHref="/auth/login"
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
                {[
                  ["Вам предложили", incoming.length],
                  ["Вы предложили", outgoing.length],
                  ["Матчи", matches.length],
                ].map(([tab, count], index) => (
                  <button
                    key={tab}
                    className={`rounded-2xl px-5 py-3 text-sm font-medium ${
                      index === 0
                        ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                        : "bg-white/5 text-white/50"
                    }`}
                  >
                    {tab} {count}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleSwaps.map((swap) => {
                  const isIncoming = swap.receiverId === userId;
                  const theirItem = serializeItem(isIncoming ? swap.senderItem : swap.receiverItem);
                  const yourItem = serializeItem(isIncoming ? swap.receiverItem : swap.senderItem);
                  const theirCard = toItemCardView(theirItem);
                  const partner = isIncoming ? swap.sender : swap.receiver;
                  return (
                    <a key={swap.id} href={`/exchange?swap=${swap.id}`}>
                      <GlassCard className="group overflow-hidden">
                        <div className="relative h-52">
                          <Image src={theirCard.image} alt={theirCard.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute left-3 top-3 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs backdrop-blur-xl">
                            {partner?.name ?? "Пользователь Menarium"}
                          </div>
                          {swap.status === SwapStatus.PENDING && isIncoming ? (
                            <div className="absolute bottom-3 right-3 flex gap-2 opacity-100 transition-opacity">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/60">
                                <XCircle className="h-4 w-4" />
                              </span>
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-purple-500">
                                <CheckCircle2 className="h-4 w-4" />
                              </span>
                            </div>
                          ) : null}
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
              <div className="mt-5 flex gap-2">
                <input className="glass-card min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-white/35" placeholder="Сообщение..." />
                <MenariumButton size="sm">Отправить</MenariumButton>
              </div>
              <button className="mt-6 flex items-center gap-2 text-sm text-white/45">
                <RotateCcw className="h-4 w-4" />
                История обновляется автоматически
              </button>
            </GlassCard>
          </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
