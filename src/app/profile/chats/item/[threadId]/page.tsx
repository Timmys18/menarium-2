import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemStatus } from "@prisma/client";
import { ArrowLeft, MessageCircle, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
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

  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
        <div className="mx-auto max-w-4xl">
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
                className="mb-5 inline-flex items-center gap-2 rounded-xl text-sm text-white/45 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
              >
                <ArrowLeft className="h-4 w-4" />
                Все чаты
              </Link>

              <GlassCard className="overflow-hidden border border-white/10">
                <header className="border-b border-white/8 p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-gradient-to-br from-blue-500/45 to-teal-400/35">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-white/35">Диалог по объявлению</p>
                        <h1 className="mt-0.5 truncate text-xl font-semibold">
                          {partner?.name ?? "Участник Menarium"}
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

                <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[180px_minmax(0,1fr)]">
                  <aside>
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
                        <p className="mt-1 text-xs text-teal-200/65">Открыть объявление →</p>
                      </Link>
                    ) : (
                      <div>
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.03]">
                          <ItemCoverImage src={itemImage} alt={thread.item.title} sizes="180px" />
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-semibold text-white/80">{thread.item.title}</p>
                        <p className="mt-1 text-xs leading-4 text-white/32">Объявление больше не опубликовано</p>
                      </div>
                    )}
                  </aside>

                  <section aria-label="Переписка" className="min-w-0 rounded-[20px] border border-white/7 bg-black/10 p-4">
                    <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200/55">
                      <MessageCircle className="h-4 w-4" />
                      История диалога
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
                    />
                  </section>
                </div>
              </GlassCard>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
