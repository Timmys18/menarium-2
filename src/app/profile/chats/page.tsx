import Link from "next/link";
import { Prisma, SwapStatus } from "@prisma/client";
import { ArrowRight, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { prisma } from "@/lib/prisma";
import { cn, loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { ChatCenterRefresh } from "./chat-center-refresh";

export const dynamic = "force-dynamic";

type ChatFilter = "unread" | "all";
type Props = {
  searchParams: Promise<{ page?: string | string[]; filter?: string | string[] }>;
};

const DEAL_CHAT_STATUSES: SwapStatus[] = [
  SwapStatus.ACCEPTED,
  SwapStatus.COMPLETED,
  SwapStatus.CANCELLED,
];
const CHAT_CENTER_PAGE_SIZE = 40;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function chatsHref(filter: ChatFilter, page?: number) {
  const search = new URLSearchParams({ filter });
  if (page && page > 1) search.set("page", String(page));
  return `/profile/chats?${search.toString()}`;
}

function dealChatHref({
  id,
  status,
  isSender,
}: {
  id: string;
  status: SwapStatus;
  isSender: boolean;
}) {
  if (status === SwapStatus.ACCEPTED) {
    return `/exchange?tab=matches&swap=${encodeURIComponent(id)}`;
  }
  if (status === SwapStatus.COMPLETED) {
    return `/exchange?tab=matches&filter=history&swap=${encodeURIComponent(id)}`;
  }
  return `/exchange?tab=${isSender ? "outgoing" : "incoming"}&filter=history&swap=${encodeURIComponent(id)}`;
}

function formatChatTime(value: Date) {
  const now = new Date();
  const isToday =
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate();

  return isToday
    ? value.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : value.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        ...(value.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
      });
}

export default async function ProfileChatsPage({ searchParams }: Props) {
  const userId = await getCurrentUserId();
  const params = await searchParams;
  const dealBaseWhere: Prisma.SwapRequestWhereInput = {
    status: { in: DEAL_CHAT_STATUSES },
    OR: [{ senderId: userId ?? "" }, { receiverId: userId ?? "" }],
  };
  const itemBaseWhere: Prisma.ItemThreadWhereInput = {
    OR: [{ buyerId: userId ?? "" }, { ownerId: userId ?? "" }],
  };
  const dealUnreadWhere: Prisma.SwapRequestWhereInput = {
    ...dealBaseWhere,
    messages: { some: { senderId: { not: userId ?? "" }, isRead: false } },
  };
  const itemUnreadWhere: Prisma.ItemThreadWhereInput = {
    ...itemBaseWhere,
    messages: { some: { senderId: { not: userId ?? "" }, isRead: false } },
  };

  const [dealTotalCount, itemTotalCount, dealUnreadCount, itemUnreadCount] = userId
    ? await Promise.all([
        prisma.swapRequest.count({ where: dealBaseWhere }),
        prisma.itemThread.count({ where: itemBaseWhere }),
        prisma.swapRequest.count({ where: dealUnreadWhere }),
        prisma.itemThread.count({ where: itemUnreadWhere }),
      ])
    : [0, 0, 0, 0];
  const allChatCount = dealTotalCount + itemTotalCount;
  const unreadChatCount = dealUnreadCount + itemUnreadCount;
  const requestedFilter = firstParam(params.filter);
  const activeFilter: ChatFilter =
    requestedFilter === "all" || requestedFilter === "unread"
      ? requestedFilter
      : unreadChatCount > 0
        ? "unread"
        : "all";
  const totalChats = activeFilter === "unread" ? unreadChatCount : allChatCount;
  const totalPages = Math.max(1, Math.ceil(totalChats / CHAT_CENTER_PAGE_SIZE));
  const requestedPage = Math.max(1, Math.floor(Number(firstParam(params.page)) || 1));
  const page = Math.min(requestedPage, totalPages);
  const candidatesToLoad = page * CHAT_CENTER_PAGE_SIZE;

  const [dealSwaps, itemThreads] = userId
    ? await Promise.all([
        prisma.swapRequest.findMany({
          where: activeFilter === "unread" ? dealUnreadWhere : dealBaseWhere,
          include: {
            sender: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true } },
            senderItem: { select: { title: true } },
            receiverItem: { select: { title: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
            _count: {
              select: {
                messages: { where: { senderId: { not: userId }, isRead: false } },
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: candidatesToLoad,
        }),
        prisma.itemThread.findMany({
          where: activeFilter === "unread" ? itemUnreadWhere : itemBaseWhere,
          include: {
            item: { select: { id: true, title: true } },
            buyer: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
            _count: {
              select: {
                messages: { where: { senderId: { not: userId }, isRead: false } },
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: candidatesToLoad,
        }),
      ])
    : [[], []];

  const dealChats = dealSwaps.map((swap) => {
    const isSender = swap.senderId === userId;
    const partner = isSender ? swap.receiver : swap.sender;
    const contextItem = isSender ? swap.receiverItem : swap.senderItem;
    const lastMessage = swap.messages[0];
    return {
      id: `deal-${swap.id}`,
      title: partner.name ?? "Участник Menarium",
      context: `Обмен · ${contextItem.title}`,
      href: dealChatHref({ id: swap.id, status: swap.status, isSender }),
      unread: swap._count.messages,
      preview: lastMessage?.text ?? "Сделка активна. Обсудите детали обмена.",
      at: lastMessage?.createdAt ?? swap.updatedAt,
      kind: "Обмен",
    };
  });
  const itemChats = itemThreads.map((thread) => {
    const partner = thread.buyerId === userId ? thread.owner : thread.buyer;
    const lastMessage = thread.messages[0];
    return {
      id: `item-${thread.id}`,
      title: partner.name ?? "Участник Menarium",
      context: `Объявление · ${thread.item.title}`,
      href: `/profile/chats/item/${thread.id}`,
      unread: thread._count.messages,
      preview: lastMessage?.text ?? "Диалог создан, сообщений пока нет.",
      at: lastMessage?.createdAt ?? thread.updatedAt,
      kind: "Объявление",
    };
  });
  const chats = [...dealChats, ...itemChats]
    .sort((left, right) => {
      const byDate = right.at.getTime() - left.at.getTime();
      return byDate || right.id.localeCompare(left.id);
    })
    .slice((page - 1) * CHAT_CENTER_PAGE_SIZE, page * CHAT_CENTER_PAGE_SIZE);

  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/60">
              Все разговоры
            </p>
            <h1 className="type-page-title text-4xl md:text-5xl">Мои чаты</h1>
          </header>

          {userId ? <ChatCenterRefresh /> : null}
          {!userId ? (
            <EmptyState
              title="Войдите, чтобы увидеть чаты"
              description="Здесь будут диалоги по объявлениям и сделкам."
              actionHref={loginHref("/profile/chats")}
              actionLabel="Войти"
            />
          ) : (
            <>
              <nav aria-label="Фильтр чатов" className="mb-5 flex gap-2 rounded-[20px] border border-white/8 bg-white/[0.025] p-2">
                {([
                  ["unread", "Новые", unreadChatCount],
                  ["all", "Все", allChatCount],
                ] as const).map(([filter, label, count]) => (
                  <Link
                    key={filter}
                    href={chatsHref(filter)}
                    aria-current={activeFilter === filter ? "page" : undefined}
                    className={cn(
                      "rounded-[14px] px-4 py-2.5 text-sm font-medium transition",
                      activeFilter === filter
                        ? "bg-gradient-to-r from-blue-500 to-teal-400 text-white"
                        : "text-white/45 hover:bg-white/[0.055] hover:text-white",
                    )}
                  >
                    {label}
                    <span className={cn("ml-2 text-xs", activeFilter === filter ? "text-white/75" : "text-white/28")}>
                      {count}
                    </span>
                  </Link>
                ))}
              </nav>

              {chats.length > 0 ? (
                <GlassCard className="overflow-hidden border border-white/8">
                  {chats.map((chat) => (
                    <Link
                      key={chat.id}
                      href={chat.href}
                      className={cn(
                        "group flex items-start gap-3 border-b border-white/[0.05] px-4 py-4 transition last:border-b-0 hover:bg-white/[0.04] sm:items-center sm:gap-4 sm:px-5",
                        chat.unread && "bg-blue-400/[0.025]",
                      )}
                    >
                      <span
                        className={cn(
                          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] sm:h-12 sm:w-12",
                          chat.unread
                            ? "bg-gradient-to-br from-blue-500/60 to-teal-400/50 text-white"
                            : "bg-white/[0.05] text-white/38",
                        )}
                      >
                        <MessageCircle className="h-5 w-5" />
                        {chat.unread ? (
                          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-amber-300 px-1 text-[9px] font-bold text-[#171008]">
                            {chat.unread > 9 ? "9+" : chat.unread}
                          </span>
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold text-white">{chat.title}</span>
                          <Badge variant={chat.kind === "Обмен" ? "teal" : "purple"}>{chat.kind}</Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-white/35">{chat.context}</span>
                        <span className={cn("mt-1 block truncate text-sm", chat.unread ? "text-white/78" : "text-white/52")}>
                          {chat.preview}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 pt-1 sm:pt-0">
                        <time dateTime={chat.at.toISOString()} className="text-xs text-white/30">
                          {formatChatTime(chat.at)}
                        </time>
                        <ArrowRight className="hidden h-4 w-4 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-teal-200 sm:block" />
                      </span>
                    </Link>
                  ))}
                </GlassCard>
              ) : (
                <EmptyState
                  title={activeFilter === "unread" ? "Новых сообщений нет" : "Чатов пока нет"}
                  description={
                    activeFilter === "unread"
                      ? "Все диалоги прочитаны. Можно открыть полную историю."
                      : "Диалоги появятся после вопросов по объявлениям или принятых обменов."
                  }
                  actionHref={activeFilter === "unread" ? chatsHref("all") : "/catalog"}
                  actionLabel={activeFilter === "unread" ? "Открыть все чаты" : "Открыть каталог"}
                />
              )}

              {totalPages > 1 ? (
                <nav aria-label="Страницы чатов" className="mt-8 flex items-center justify-center gap-3">
                  {page > 1 ? (
                    <Link
                      href={chatsHref(activeFilter, page - 1)}
                      className="rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      ← Назад
                    </Link>
                  ) : null}
                  <span className="text-xs text-white/35">{page} из {totalPages}</span>
                  {page < totalPages ? (
                    <Link
                      href={chatsHref(activeFilter, page + 1)}
                      className="rounded-[14px] bg-gradient-to-r from-blue-500 to-teal-400 px-4 py-2.5 text-sm font-medium text-white"
                    >
                      Дальше →
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
