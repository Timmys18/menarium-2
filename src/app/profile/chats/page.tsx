import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { SwapStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { prisma } from "@/lib/prisma";
import { loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";

export const dynamic = "force-dynamic";

// Статусы, в которых у сделки есть доступный чат (после принятия обмена).
const DEAL_CHAT_STATUSES: SwapStatus[] = [
  SwapStatus.ACCEPTED,
  SwapStatus.COMPLETED,
  SwapStatus.CANCELLED,
];

export default async function ProfileChatsPage() {
  const userId = await getCurrentUserId();

  const [dealSwaps, itemThreads] = userId
    ? await Promise.all([
        // Источник — сами сделки, а не сообщения: чат виден даже без переписки.
        prisma.swapRequest.findMany({
          where: {
            status: { in: DEAL_CHAT_STATUSES },
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
          include: {
            sender: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true } },
            senderItem: { select: { title: true } },
            receiverItem: { select: { title: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
            _count: { select: { messages: { where: { senderId: { not: userId }, isRead: false } } } },
          },
          orderBy: { updatedAt: "desc" },
          take: 40,
        }),
        prisma.itemThread.findMany({
          where: { OR: [{ buyerId: userId }, { ownerId: userId }] },
          include: {
            item: { select: { id: true, title: true } },
            buyer: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
            _count: { select: { messages: { where: { senderId: { not: userId }, isRead: false } } } },
          },
          orderBy: { updatedAt: "desc" },
          take: 40,
        }),
      ])
    : [[], []];

  const dealChats = dealSwaps.map((swap) => {
    const partner = swap.senderId === userId ? swap.receiver : swap.sender;
    const contextItem = swap.senderId === userId ? swap.receiverItem : swap.senderItem;
    const lastMessage = swap.messages[0];
    return {
      id: `deal-${swap.id}`,
      title: partner.name ?? "Пользователь Menarium",
      context: `Обмен · ${contextItem.title}`,
      href: `/exchange?tab=matches&swap=${swap.id}`,
      unread: swap._count.messages,
      preview: lastMessage?.text ?? "Сделка активна. Обсудите детали обмена.",
      at: lastMessage?.createdAt ?? swap.updatedAt,
    };
  });
  const itemChats = itemThreads.map((thread) => {
    const partner = thread.buyerId === userId ? thread.owner : thread.buyer;
    const lastMessage = thread.messages[0];
    return {
      id: `item-${thread.id}`,
      title: partner.name ?? "Пользователь Menarium",
      context: `Объявление · ${thread.item.title}`,
      href: `/item/${thread.item.id}?thread=${thread.id}`,
      unread: thread._count.messages,
      preview: lastMessage?.text ?? "Диалог создан, сообщений пока нет.",
      at: lastMessage?.createdAt ?? thread.updatedAt,
    };
  });
  const chats = [...dealChats, ...itemChats].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 40);

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Мои чаты</h1>
            <p className="mt-2 text-white/60">Все диалоги по обменам и объявлениям в одном месте.</p>
          </div>
          {!userId ? (
            <EmptyState
              title="Войдите, чтобы увидеть чаты"
              description="Здесь будут диалоги по объявлениям и сделкам."
              actionHref={loginHref("/profile/chats")}
              actionLabel="Войти"
            />
          ) : chats.length > 0 ? (
            <GlassCard className="overflow-hidden">
              {chats.map((chat) => (
                <Link key={chat.id} href={chat.href} className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-4 transition-colors hover:bg-white/[0.04] last:border-b-0">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/60 to-purple-500/60">
                    <MessageCircle className="h-5 w-5" />
                    {chat.unread ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-teal-400" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium">{chat.title}</h2>
                      {chat.unread ? <Badge variant="teal">Новое {chat.unread}</Badge> : null}
                    </div>
                    <p className="text-sm text-white/40">{chat.context}</p>
                    <p className="mt-1 truncate text-sm text-white/65">{chat.preview}</p>
                  </div>
                  <span className="text-xs text-white/30">
                    {chat.at.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </Link>
              ))}
            </GlassCard>
          ) : (
            <EmptyState
              title="Чатов пока нет"
              description="Диалоги появятся после вопросов по объявлениям или принятых обменов."
              actionHref="/catalog"
              actionLabel="Открыть каталог"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
