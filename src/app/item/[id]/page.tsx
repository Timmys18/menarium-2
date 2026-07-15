import { notFound } from "next/navigation";
import Link from "next/link";
import { ItemStatus, UserStatus } from "@prisma/client";
import { ArrowLeft, ArrowRightLeft, MessageCircle, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { serializeItem } from "@/features/items/serializers";
import { itemWantedLabel, toItemCardView } from "@/features/items/presenters";
import { canInteractWithItem, visibleItemWhere } from "@/features/items/visibility";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/server/admin";
import { getCurrentUserIdentity } from "@/server/session";
import { loginHref } from "@/lib/utils";
import { ExchangeProposal } from "./exchange-proposal";
import { ItemChatPanel } from "./item-chat-panel";
import { ItemImageGallery } from "./item-image-gallery";
import { itemStatusLabels } from "@/features/items/status-labels";
import { DeleteItemButton } from "./owner-actions";
import { TrustActions } from "@/components/trust/trust-actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ thread?: string }>;
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
  const identity = await getCurrentUserIdentity();
  const viewerIsAdmin = Boolean(identity && isAdminEmail(identity.email));
  const viewer = identity ? { id: identity.id, isAdmin: viewerIsAdmin } : null;
  const item = await prisma.item.findFirst({
    where: visibleItemWhere(id, viewer),
    include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
  });

  if (!item) notFound();

  const publicItem = serializeItem(item);
  const card = toItemCardView(publicItem);
  const wanted = itemWantedLabel(publicItem);
  const userId = identity?.id ?? null;
  const isOwner = Boolean(userId && publicItem.owner?.id === userId);
  const canInteract = canInteractWithItem(item.status, viewerIsAdmin);
  const ownerId = publicItem.owner?.id;
  const blocks =
    userId && ownerId && !isOwner && canInteract
      ? await prisma.userBlock.findMany({
          where: {
            OR: [
              { blockerId: userId, blockedId: ownerId },
              { blockerId: ownerId, blockedId: userId },
            ],
          },
          select: { blockerId: true },
        })
      : [];
  const communicationBlocked = blocks.length > 0;
  const viewerBlockedOwner = blocks.some((block) => block.blockerId === userId);
  const userItems =
    userId && !isOwner && canInteract && !communicationBlocked
      ? await prisma.item.findMany({
          where: { ownerId: userId, status: ItemStatus.ACTIVE, id: { not: publicItem.id } },
          select: { id: true, title: true },
          orderBy: { updatedAt: "desc" },
        })
      : [];
  // Чат по объявлению доступен и покупателю, и владельцу.
  // - thread=open: покупатель начинает диалог (владельцу с самим собой нельзя);
  // - thread=<id>: открытие конкретной ветки — доступно обоим участникам.
  const chatViewerId = query.thread && userId && (canInteract || isOwner) ? userId : null;
  const thread = chatViewerId
    ? query.thread === "open"
      ? isOwner
        ? null
        : await prisma.itemThread.findUnique({
            where: { itemId_buyerId: { itemId: publicItem.id, buyerId: chatViewerId } },
            include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
          })
      : await prisma.itemThread.findFirst({
          where: {
            id: query.thread,
            itemId: publicItem.id,
            OR: [{ buyerId: chatViewerId }, { ownerId: chatViewerId }],
          },
          include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
        })
    : null;

  // Показываем панель, если пользователь — покупатель (может начать диалог),
  // либо владелец с уже существующей веткой (может ответить).
  const showChatPanel = Boolean(chatViewerId && !communicationBlocked && (!isOwner || thread));

  if (thread && chatViewerId) {
    await prisma.itemThreadMessage.updateMany({
      where: { threadId: thread.id, senderId: { not: chatViewerId }, isRead: false },
      data: { isRead: true },
    });
  }

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
              <div className="relative">
                <ItemImageGallery
                  images={publicItem.images.length > 0 ? publicItem.images : [{ id: "placeholder", url: card.image }]}
                  title={publicItem.title}
                />
                <div className="absolute left-5 top-5 z-10">
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
                    item.status === ItemStatus.ACTIVE ? (
                      <div className="flex-1 space-y-3">
                        <MenariumLinkButton href={`/item/${publicItem.id}/edit`} className="w-full">
                          Редактировать объявление
                        </MenariumLinkButton>
                        <DeleteItemButton itemId={publicItem.id} />
                      </div>
                    ) : (
                      <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                        Объявление не опубликовано. Оно доступно вам для просмотра, но обмен и редактирование закрыты.
                      </div>
                    )
                  ) : !canInteract ? (
                    <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                      Объявление снято с публикации и недоступно для новых контактов.
                    </div>
                  ) : userId && !communicationBlocked ? (
                    <ExchangeProposal receiverItemId={publicItem.id} userItems={userItems} />
                  ) : userId ? (
                    <div className="flex-1 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/80">
                      Контакт с этим пользователем ограничен.
                    </div>
                  ) : (
                    <MenariumLinkButton href={loginHref(`/item/${publicItem.id}`)} className="flex-1">
                      Войти и предложить обмен
                    </MenariumLinkButton>
                  )}
                  {!isOwner && canInteract && !communicationBlocked ? (
                    <MenariumLinkButton
                      href={
                        userId
                          ? `/item/${publicItem.id}?thread=open`
                          : loginHref(`/item/${publicItem.id}?thread=open`)
                      }
                      variant="secondary"
                      className="flex-1"
                    >
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
                  <div className="flex justify-between"><span>Владелец</span>
                    {publicItem.owner?.id ? (
                      <Link href={`/user/${publicItem.owner.id}`} className="text-teal-300 hover:underline">
                        {publicItem.owner.name ?? "Пользователь Menarium"}
                      </Link>
                    ) : (
                      <span className="text-white">Пользователь Menarium</span>
                    )}
                  </div>
                  <div className="flex justify-between"><span>Статус</span><span className="text-teal-300">{itemStatusLabels[publicItem.status as keyof typeof itemStatusLabels]}</span></div>
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
              </GlassCard>
            </div>
          </div>
          {showChatPanel && chatViewerId ? (
            <ItemChatPanel
              itemId={publicItem.id}
              initialThreadId={thread?.id ?? null}
              currentUserId={chatViewerId}
              messages={itemChatMessages}
              isOwner={isOwner}
            />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
