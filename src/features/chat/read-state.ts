import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishUserEvents } from "@/lib/realtime";

async function publishCountsIfChanged(userId: string, entityId: string, changed: number) {
  if (changed === 0) return;
  await publishUserEvents([userId], { type: "counts", entityId });
}

export async function markDealChatRead(userId: string, swapId: string) {
  const [messages, notifications] = await prisma.$transaction([
    prisma.dealMessage.updateMany({
      where: { swapId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
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
  return changed;
}

export async function markItemThreadRead(userId: string, threadId: string) {
  const [messages, notifications] = await prisma.$transaction([
    prisma.itemThreadMessage.updateMany({
      where: { threadId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
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
  return changed;
}
