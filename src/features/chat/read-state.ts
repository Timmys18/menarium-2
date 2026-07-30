import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishUserEvents } from "@/lib/realtime";

async function publishCountsIfChanged(userId: string, entityId: string, changed: number) {
  if (changed === 0) return;
  await publishUserEvents([userId], { type: "counts", entityId });
}

export async function markDealChatRead(userId: string, swapId: string) {
  const readAt = new Date();
  const [messages, notifications] = await prisma.$transaction([
    prisma.dealMessage.updateMany({
      where: { swapId, senderId: { not: userId }, isRead: false },
      data: { isRead: true, readAt },
    }),
    prisma.notification.updateMany({
      where: {
        userId,
        type: NotificationType.DEAL_MESSAGE_RECEIVED,
        entityId: swapId,
        isRead: false,
      },
      data: { isRead: true },
    }),
  ]);

  const changed = messages.count + notifications.count;
  await publishCountsIfChanged(userId, swapId, changed);
  if (messages.count > 0) {
    const swap = await prisma.swapRequest.findUnique({
      where: { id: swapId },
      select: { senderId: true, receiverId: true },
    });
    if (swap) {
      await publishUserEvents(
        [swap.senderId, swap.receiverId].filter((participantId) => participantId !== userId),
        {
        type: "chat-read",
        entityId: swapId,
        actorId: userId,
        },
      );
    }
  }
  return changed;
}

export async function markItemThreadRead(userId: string, threadId: string) {
  const readAt = new Date();
  const [messages, notifications] = await prisma.$transaction([
    prisma.itemThreadMessage.updateMany({
      where: { threadId, senderId: { not: userId }, isRead: false },
      data: { isRead: true, readAt },
    }),
    prisma.notification.updateMany({
      where: {
        userId,
        type: NotificationType.ITEM_MESSAGE_RECEIVED,
        entityId: threadId,
        isRead: false,
      },
      data: { isRead: true },
    }),
  ]);

  const changed = messages.count + notifications.count;
  await publishCountsIfChanged(userId, threadId, changed);
  if (messages.count > 0) {
    const thread = await prisma.itemThread.findUnique({
      where: { id: threadId },
      select: { buyerId: true, ownerId: true },
    });
    if (thread) {
      await publishUserEvents(
        [thread.buyerId, thread.ownerId].filter((participantId) => participantId !== userId),
        {
        type: "chat-read",
        entityId: threadId,
        actorId: userId,
        },
      );
    }
  }
  return changed;
}
