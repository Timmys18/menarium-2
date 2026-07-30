import type { ItemThread } from "@prisma/client";
import type { ItemThreadMessageWithRelations } from "@/features/chat/message-pages";

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

export function serializeItemThreadMessage(message: ItemThreadMessageWithRelations) {
  return {
    id: message.id,
    threadId: message.threadId,
    senderId: message.senderId,
    text: message.text,
    isRead: message.isRead,
    readAt: message.readAt?.toISOString() ?? null,
    attachments: message.attachments,
    replyTo: message.replyTo,
    createdAt: message.createdAt.toISOString(),
  };
}
