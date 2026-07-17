import { notFound } from "next/navigation";
import Link from "next/link";
import { ItemStatus, UserStatus } from "@prisma/client";
import {
  ArrowLeft,
  ArrowRightLeft,
  ChevronRight,
  Globe2,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { FavoriteButton } from "@/components/menarium/favorite-button";
import { parseCatalogReturnHref } from "@/features/items/catalog-url";
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
import { loadItemThreadMessagePage } from "@/features/chat/message-pages";
import { markItemThreadRead } from "@/features/chat/read-state";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ thread?: string | string[]; from?: string | string[] }>;
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
  const returnHref = parseCatalogReturnHref(query.from) ?? "/catalog";
  const identity = await getCurrentUserIdentity();
  const userId = identity?.id ?? null;
  const viewerIsAdmin = Boolean(identity && isAdminEmail(identity.email));
  const viewer = identity ? { id: identity.id, isAdmin: viewerIsAdmin } : null;
  const itemInclude = {
    owner: { select: { id: true, name: true, city: true, image: true } },
    images: true,
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
  const card = toItemCardView(publicItem);
  const wanted = itemWantedLabel(publicItem);
  const itemHref =
    returnHref === "/catalog"
      ? `/item/${publicItem.id}`
      : `/item/${publicItem.id}?from=${encodeURIComponent(returnHref)}`;
  const chatHref = `${itemHref}${itemHref.includes("?") ? "&" : "?"}thread=open`;
  const isOwner = Boolean(userId && publicItem.owner?.id === userId);
  const canInteract = canInteractWithItem(item.status, viewerIsAdmin);
  const ownerId = publicItem.owner?.id;
  const blocks =
    userId && ownerId && !isOwner
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
  const favorite =
    userId && !isOwner && canInteract && !communicationBlocked
      ? await prisma.favorite.findUnique({
          where: { userId_itemId: { userId, itemId: publicItem.id } },
          select: { itemId: true },
        })
      : null;
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

  const itemChatMessages =
    itemMessagePage.messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      text: message.text,
      createdAt: message.createdAt.toISOString(),
    }));

  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
        <div className="mx-auto max-w-6xl">
          <MenariumLinkButton href={returnHref} variant="ghost" size="sm" className="mb-4 sm:mb-6">
            <ArrowLeft className="h-4 w-4" />
            Назад в каталог
          </MenariumLinkButton>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-7">
            <div className="lg:sticky lg:top-28">
              <GlassCard className="overflow-hidden rounded-[24px] sm:rounded-[32px]">
                <div className="relative">
                  <ItemImageGallery
                    images={publicItem.images.length > 0 ? publicItem.images : [{ id: "placeholder", url: card.image }]}
                    title={publicItem.title}
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
                  <h1 className="min-w-0 flex-1 text-3xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-4xl">
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
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/52">
                  <span className="inline-flex items-center gap-1.5">
                    {publicItem.isOnline ? <Globe2 className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    {publicItem.isOnline ? `Онлайн · ${publicItem.city}` : publicItem.city}
                  </span>
                  {publicItem.owner?.id ? (
                    <Link
                      href={`/user/${publicItem.owner.id}`}
                      className="inline-flex items-center gap-1.5 text-white/66 transition hover:text-teal-200"
                    >
                      <UserRound className="h-4 w-4" />
                      {publicItem.owner.name ?? "Пользователь Menarium"}
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

                <div className="flex flex-col gap-3">
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
                      <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                        Объявление не опубликовано. Оно доступно вам для просмотра, но обмен и редактирование закрыты.
                      </div>
                    )
                  ) : !canInteract ? (
                    <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
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
                      className="flex-1"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Написать
                    </MenariumLinkButton>
                  ) : null}
                </div>

                <div className="mt-5 flex items-start gap-2.5 border-t border-white/8 pt-5 text-sm leading-relaxed text-white/44">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300/72" />
                  Договорённости и завершение обмена фиксируются в Menarium. Не передавайте коды и данные банковских карт в сообщениях.
                </div>

                <section className="mt-6 border-t border-white/8 pt-6" aria-labelledby="item-description-title">
                  <h2 id="item-description-title" className="text-lg font-semibold text-white/92">
                    Об объявлении
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-white/58">
                    {publicItem.description}
                  </p>
                </section>
              </GlassCard>

              <GlassCard className="p-5 sm:p-6">
                {publicItem.owner?.id ? (
                  <Link
                    href={`/user/${publicItem.owner.id}`}
                    className="group mb-5 flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.025] p-3.5 transition hover:border-teal-300/18 hover:bg-teal-300/[0.04]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-400/18 to-teal-300/12 text-teal-100/80">
                      <UserRound className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-white/40">Владелец</span>
                      <span className="block truncate text-sm font-semibold text-white/86">
                        {publicItem.owner.name ?? "Пользователь Menarium"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/28 transition group-hover:translate-x-0.5 group-hover:text-teal-200/70" />
                  </Link>
                ) : null}

                <h2 className="mb-4 text-lg font-semibold">Детали</h2>
                <div className="divide-y divide-white/7 text-sm">
                  <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                    <span className="text-white/42">Город</span>
                    <span className="text-right text-white/82">{publicItem.city}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-white/42">Категория</span>
                    <span className="text-right text-white/82">{publicItem.category}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-white/42">Формат</span>
                    <span className="text-right text-white/82">
                      {publicItem.isOnline ? "Можно онлайн" : `Лично · ${publicItem.city}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                    <span className="text-white/42">Статус</span>
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
              </GlassCard>
            </div>
          </div>
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
        </div>
      </div>
    </AppShell>
  );
}
