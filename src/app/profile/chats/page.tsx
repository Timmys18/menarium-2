import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ProfileChatsPage() {
  const userId = await getCurrentUserId();
  const [dealMessages, itemThreads] = userId
    ? await Promise.all([
        prisma.dealMessage.findMany({
          where: { swap: { OR: [{ senderId: userId }, { receiverId: userId }] } },
          include: {
            swap: {
              include: {
                sender: { select: { id: true, name: true } },
                receiver: { select: { id: true, name: true } },
                senderItem: { select: { title: true } },
                receiverItem: { select: { title: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.itemThread.findMany({
          where: { OR: [{ buyerId: userId }, { ownerId: userId }] },
          include: {
            item: { select: { id: true, title: true } },
            buyer: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
      ])
    : [[], []];

  const seenSwaps = new Set<string>();
  const dealChats = dealMessages.flatMap((message) => {
    if (seenSwaps.has(message.swapId)) return [];
    seenSwaps.add(message.swapId);
    const partner = message.swap.senderId === userId ? message.swap.receiver : message.swap.sender;
    const contextItem = message.swap.senderId === userId ? message.swap.receiverItem : message.swap.senderItem;
    return [
      {
        id: `deal-${message.swapId}`,
        title: partner.name ?? "Пользователь Menarium",
        context: `Обмен · ${contextItem.title}`,
        href: `/exchange?swap=${message.swapId}`,
        unread: message.senderId !== userId && !message.isRead ? 1 : 0,
        preview: message.text,
        at: message.createdAt,
      },
    ];
  });
  const itemChats = itemThreads.map((thread) => {
    const partner = thread.buyerId === userId ? thread.owner : thread.buyer;
    const lastMessage = thread.messages[0];
    return {
      id: `item-${thread.id}`,
      title: partner.name ?? "Пользователь Menarium",
      context: `Объявление · ${thread.item.title}`,
      href: `/item/${thread.item.id}?thread=${thread.id}`,
      unread: lastMessage && lastMessage.senderId !== userId && !lastMessage.isRead ? 1 : 0,
      preview: lastMessage?.text ?? "Диалог создан, сообщений пока нет.",
      at: lastMessage?.createdAt ?? thread.updatedAt,
    };
  });
  const chats = [...dealChats, ...itemChats].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30);

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
              actionHref="/auth/login"
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
