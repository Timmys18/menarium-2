import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemStatus } from "@prisma/client";
import { ArrowLeft, MessageCircle, UserRound } from "lucide-react";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { Badge } from "@/components/menarium/badge";
import { SurfaceCard } from "@/components/menarium/card";
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

  return (
    <div className="max-w-5xl">
          {!userId ? (
            <EmptyState
              title="Войдите, чтобы открыть диалог"
              description="История переписки доступна только участникам разговора."
              actionHref={loginHref(`/profile/chats/item/${threadId}`)}
              actionLabel="Войти"
            />
          ) : thread ? (
            <>
              <Link
                href="/profile/chats"
                className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm text-white/78 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/75"
              >
                <ArrowLeft className="h-4 w-4" />
                Все чаты
              </Link>

              <SurfaceCard className="flex h-[calc(100dvh-14rem)] min-h-[34rem] flex-col overflow-hidden border border-white/10 md:h-auto md:max-h-[52rem] md:min-h-[42rem]">
                <header className="shrink-0 border-b border-white/8 px-3.5 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-blue-400/15 text-blue-100">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-white/62">Объявление</p>
                        <h1 className="mt-0.5 truncate text-xl font-semibold">
                          {partner?.name ?? "Участник Менариум"}
                        </h1>
                      </div>
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

                <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
                  {canOpenItem ? (
                    <Link
                      href={`/item/${thread.item.id}`}
                      className="group mb-3 flex min-h-16 shrink-0 items-center gap-3 rounded-[16px] border border-white/8 bg-white/[0.035] p-2 transition hover:border-white/14 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
                    >
                      <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[12px] bg-white/[0.03]">
                        <ItemCoverImage src={itemImage} alt="" sizes="64px" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-teal-100/82">Объявление</span>
                        <span className="mt-1 block truncate text-sm font-semibold text-white/86">{thread.item.title}</span>
                      </span>
                      <span className="pr-1 text-xs font-medium text-teal-100">Открыть</span>
                    </Link>
                  ) : (
                    <div className="mb-3 flex min-h-16 shrink-0 items-center gap-3 rounded-[16px] border border-white/8 bg-white/[0.025] p-2">
                      <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[12px] bg-white/[0.03]">
                        <ItemCoverImage src={itemImage} alt="" sizes="64px" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white/78">{thread.item.title}</span>
                        <span className="mt-1 block text-xs text-white/62">Объявление больше не опубликовано</span>
                      </span>
                    </div>
                  )}

                  <section aria-label="Переписка" className="flex min-h-0 flex-1 flex-col rounded-[18px] border border-white/7 bg-black/10 p-3 sm:p-4">
                    <div className="mb-2 flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100/82">
                      <MessageCircle className="h-4 w-4" />
                      Переписка
                    </div>
                    <ChatConversation
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
                      screenLayout
                    />
                  </section>
                </div>
              </SurfaceCard>
            </>
          ) : null}
    </div>
  );
}
