import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemStatus } from "@prisma/client";
import { ArrowLeft, MessageCircle, UserRound } from "lucide-react";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { Badge } from "@/components/menarium/badge";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";
import { loadItemThreadMessagePage } from "@/features/chat/message-pages";
import { markItemThreadRead } from "@/features/chat/read-state";
import { serializeItemThreadMessage } from "@/features/chat/serializers";
import { itemStatusLabels } from "@/features/items/status-labels";
import { prisma } from "@/lib/prisma";
import { loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ threadId: string }>;
};

export default async function ItemThreadPage({ params }: Props) {
  const { threadId } = await params;
  const userId = await getCurrentUserId();
  const thread = userId
    ? await prisma.itemThread.findFirst({
        where: {
          id: threadId,
          OR: [{ buyerId: userId }, { ownerId: userId }],
        },
        include: {
          item: { include: { images: true } },
          buyer: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
      })
    : null;

  if (userId && !thread) notFound();

  const messagePage =
    thread && userId
      ? (
          await Promise.all([
            loadItemThreadMessagePage({ threadId }),
            markItemThreadRead(userId, threadId),
          ])
        )[0]
      : { messages: [], nextCursor: null };
  const messages = messagePage.messages.map(serializeItemThreadMessage);
  const partner = thread
    ? thread.buyerId === userId
      ? thread.owner
      : thread.buyer
    : null;
  const canWrite = thread?.item.status === ItemStatus.ACTIVE;
  const canOpenItem =
    thread && userId
      ? thread.item.status === ItemStatus.ACTIVE || thread.item.ownerId === userId
      : false;
  const itemImage = thread?.item.images[0]?.url ?? "/menarium-placeholder.svg";

  if (!userId) {
    return (
      <div className="max-w-4xl">
        <EmptyState
          title="Войдите, чтобы открыть диалог"
          description="История переписки доступна только участникам разговора."
          actionHref={loginHref(`/profile/chats/item/${threadId}`)}
          actionLabel="Войти"
        />
      </div>
    );
  }

  if (!thread) return null;

  const itemSummary = (
    <div className="flex min-w-0 items-center gap-3">
      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[13px] border border-white/8 bg-white/[0.03] lg:h-full lg:w-full lg:rounded-[18px]">
        <ItemCoverImage
          src={itemImage}
          alt={thread.item.title}
          sizes="(max-width: 1023px) 44px, 180px"
          imageClassName="transition-transform duration-500 group-hover:scale-105"
        />
      </span>
      <span className="min-w-0 lg:hidden">
        <span className="block truncate text-sm font-medium text-white/85">{thread.item.title}</span>
        <span className="block text-micro text-white/62">
          {canOpenItem ? "Открыть объявление →" : "Объявление больше не опубликовано"}
        </span>
      </span>
    </div>
  );

  return (
    // На телефоне диалог занимает экран целиком: обвязка кабинета скрывается
    // (см. .profile-shell:has([data-immersive-chat]) в globals.css).
    <div data-immersive-chat className="max-w-4xl lg:block">
      <Link
        href="/profile/chats"
        className="profile-chrome mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm text-white/78 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/75"
      >
        <ArrowLeft className="h-4 w-4" />
        Все чаты
      </Link>

      <GlassCard className="flex min-h-0 flex-1 flex-col overflow-hidden border border-white/10">
        <header className="shrink-0 border-b border-white/8 p-3.5 sm:p-5">
          <div className="flex items-center gap-3">
            {/* На узком экране заголовок диалога и есть кнопка «назад»:
                отдельная ссылка над карточкой там уже скрыта. */}
            <Link
              href="/profile/chats"
              aria-label="Все чаты"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/78 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/75 lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-gradient-to-br from-blue-500/45 to-teal-400/35 lg:flex">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-micro text-white/62">Диалог по объявлению</p>
              <h1 className="mt-0.5 truncate text-lg font-semibold sm:text-xl">
                {partner?.name ?? "Участник Менариум"}
              </h1>
            </div>
            <Badge
              variant={
                thread.item.status === ItemStatus.ACTIVE
                  ? "teal"
                  : thread.item.status === ItemStatus.IN_DEAL
                    ? "gold"
                    : "glass"
              }
            >
              {itemStatusLabels[thread.item.status]}
            </Badge>
          </div>
        </header>

        {/* Карточка объявления: узкая полоса-контекст на телефоне, колонка на
            десктопе. Раньше на телефоне она занимала целый экран до переписки. */}
        <div className="shrink-0 border-b border-white/8 px-3.5 py-2.5 lg:hidden">
          {canOpenItem ? (
            <Link
              href={`/item/${thread.item.id}`}
              className="group block rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
            >
              {itemSummary}
            </Link>
          ) : (
            itemSummary
          )}
        </div>

        <div className="grid min-h-0 flex-1 gap-5 p-3.5 sm:p-5 lg:grid-cols-[180px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            {canOpenItem ? (
              <Link
                href={`/item/${thread.item.id}`}
                className="group block rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.03]">
                  <ItemCoverImage
                    src={itemImage}
                    alt={thread.item.title}
                    sizes="180px"
                    imageClassName="transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold text-white/80">{thread.item.title}</p>
                <p className="mt-1 text-xs text-teal-100">Открыть объявление →</p>
              </Link>
            ) : (
              <div>
                <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.03]">
                  <ItemCoverImage src={itemImage} alt={thread.item.title} sizes="180px" />
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-semibold text-white/80">{thread.item.title}</p>
                <p className="mt-1 text-xs leading-4 text-white/62">Объявление больше не опубликовано</p>
              </div>
            )}
          </aside>

          <section
            aria-label="Переписка"
            className="flex min-h-0 min-w-0 flex-col rounded-[20px] border border-white/7 bg-black/10 p-3.5 sm:p-4"
          >
            <div className="mb-3 hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200/55 lg:flex">
              <MessageCircle className="h-4 w-4" />
              История диалога
            </div>
            <ChatConversation
              fill
              target={{
                endpoint: `/api/items/chat/${thread.id}/messages`,
                entityId: thread.id,
              }}
              currentUserId={userId}
              initialMessages={messages}
              initialNextCursor={messagePage.nextCursor}
              realtimeTypes={["item-message"]}
              canWrite={canWrite}
              placeholder="Сообщение..."
              disabledPlaceholder="Объявление неактивно — история доступна только для чтения"
              emptyMessage="Сообщений пока нет. Начните разговор с важного вопроса об объявлении."
              draftKey={`item:${thread.item.id}`}
              kind="ITEM"
            />
          </section>
        </div>
      </GlassCard>
    </div>
  );
}
