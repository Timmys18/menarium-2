import type { ItemThread, ItemThreadMessage } from "@prisma/client";

export function serializeItemThread(thread: ItemThread) {
  return {
    id: thread.id,
    itemId: thread.itemId,
    buyerId: thread.buyerId,
    ownerId: thread.ownerId,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  };
}

export function serializeItemThreadMessage(message: ItemThreadMessage) {
  return {
    id: message.id,
    threadId: message.threadId,
    senderId: message.senderId,
    text: message.text,
    isRead: message.isRead,
    createdAt: message.createdAt.toISOString(),
  };
}
