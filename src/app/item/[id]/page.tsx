import Image from "next/image";
import { notFound } from "next/navigation";
import { ItemStatus } from "@prisma/client";
import { ArrowLeft, ArrowRightLeft, MessageCircle, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { serializeItem } from "@/features/items/serializers";
import { itemWantedLabel, toItemCardView } from "@/features/items/presenters";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { ExchangeProposal } from "./exchange-proposal";
import { ItemChatPanel } from "./item-chat-panel";
import { DeleteItemButton } from "./owner-actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ thread?: string }>;
};

export const dynamic = "force-dynamic";

export default async function ItemPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
  });

  if (!item) notFound();

  const publicItem = serializeItem(item);
  const card = toItemCardView(publicItem);
  const wanted = itemWantedLabel(publicItem);
  const userId = await getCurrentUserId();
  const isOwner = Boolean(userId && publicItem.owner?.id === userId);
  const userItems =
    userId && !isOwner
      ? await prisma.item.findMany({
          where: { ownerId: userId, status: ItemStatus.ACTIVE, id: { not: publicItem.id } },
          select: { id: true, title: true },
          orderBy: { updatedAt: "desc" },
        })
      : [];
  const chatUserId = query.thread && userId && !isOwner ? userId : null;
  const thread = chatUserId
    ? query.thread === "open"
      ? await prisma.itemThread.findUnique({
          where: { itemId_buyerId: { itemId: publicItem.id, buyerId: chatUserId } },
          include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
        })
      : await prisma.itemThread.findFirst({
          where: {
            id: query.thread,
            itemId: publicItem.id,
            OR: [{ buyerId: chatUserId }, { ownerId: chatUserId }],
          },
          include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
        })
    : null;
  const itemChatMessages =
    thread?.messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      text: message.text,
      createdAt: message.createdAt.toISOString(),
    })) ?? [];

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-6xl">
          <MenariumLinkButton href="/catalog" variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4" />
            Назад в каталог
          </MenariumLinkButton>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <GlassCard className="overflow-hidden rounded-[32px]">
              <div className="relative h-[560px]">
                <Image src={card.image} alt={card.title} fill className="object-cover" priority />
                <div className="absolute left-5 top-5">
                  <Badge>{publicItem.category}</Badge>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-6">
              <GlassCard className="p-8">
                <h1 className="mb-4 text-4xl font-bold tracking-tight">{publicItem.title}</h1>
                <p className="mb-6 whitespace-pre-line text-white/60">{publicItem.description}</p>
                <div className="mb-6 flex items-center gap-2 text-white/60">
                  <ArrowRightLeft className="h-5 w-5 text-purple-400" />
                  Хочет: <span className="text-white">{wanted}</span>
                </div>
                <div className="mb-8 flex items-center gap-2 text-white/60">
                  <ShieldCheck className="h-5 w-5 text-teal-400" />
                  Безопасная сделка через статусы Menarium
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {isOwner ? (
                    <div className="flex-1 space-y-3">
                      <MenariumLinkButton href={`/item/${publicItem.id}/edit`} className="w-full">
                        Редактировать объявление
                      </MenariumLinkButton>
                      <DeleteItemButton itemId={publicItem.id} />
                    </div>
                  ) : userId ? (
                    <ExchangeProposal receiverItemId={publicItem.id} userItems={userItems} />
                  ) : (
                    <MenariumLinkButton href="/auth/login" className="flex-1">
                      Войти и предложить обмен
                    </MenariumLinkButton>
                  )}
                  {!isOwner ? (
                    <MenariumLinkButton href={`/item/${publicItem.id}?thread=open`} variant="secondary" className="flex-1">
                      <MessageCircle className="h-5 w-5" />
                      Написать
                    </MenariumLinkButton>
                  ) : null}
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="mb-3 text-xl font-semibold">Детали</h2>
                <div className="grid gap-3 text-sm text-white/55">
                  <div className="flex justify-between"><span>Город</span><span className="text-white">{publicItem.city}</span></div>
                  <div className="flex justify-between"><span>Категория</span><span className="text-white">{publicItem.category}</span></div>
                  <div className="flex justify-between"><span>Тип</span><span className="text-white">{publicItem.type === "SERVICE" ? "Услуга" : "Предмет"}</span></div>
                  <div className="flex justify-between"><span>Владелец</span><span className="text-white">{publicItem.owner?.name ?? "Пользователь Menarium"}</span></div>
                  <div className="flex justify-between"><span>Статус</span><span className="text-teal-300">{publicItem.status === "ACTIVE" ? "Активно" : publicItem.status}</span></div>
                </div>
              </GlassCard>
            </div>
          </div>
          {chatUserId ? (
            <ItemChatPanel
              itemId={publicItem.id}
              initialThreadId={thread?.id ?? null}
              currentUserId={chatUserId}
              messages={itemChatMessages}
            />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
