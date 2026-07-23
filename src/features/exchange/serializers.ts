import type { DealMessage, Item, MediaAsset, SwapRequest, User } from "@prisma/client";
import { serializeItem } from "@/features/items/serializers";

type SwapWithItems = SwapRequest & {
  sender?: Pick<User, "id" | "name" | "city" | "image"> | null;
  receiver?: Pick<User, "id" | "name" | "city" | "image"> | null;
  senderItem?: (Item & { images?: MediaAsset[]; owner?: Pick<User, "id" | "name" | "city" | "image"> | null }) | null;
  receiverItem?: (Item & { images?: MediaAsset[]; owner?: Pick<User, "id" | "name" | "city" | "image"> | null }) | null;
};

export function serializeSwap(swap: SwapWithItems) {
  return {
    id: swap.id,
    status: swap.status,
    senderId: swap.senderId,
    receiverId: swap.receiverId,
    senderCompleted: swap.senderCompleted,
    receiverCompleted: swap.receiverCompleted,
    acceptedAt: swap.acceptedAt?.toISOString() ?? null,
    completedAt: swap.completedAt?.toISOString() ?? null,
    expiresAt: swap.expiresAt.toISOString(),
    createdAt: swap.createdAt.toISOString(),
    updatedAt: swap.updatedAt.toISOString(),
    sender: swap.sender ?? null,
    receiver: swap.receiver ?? null,
    senderItem: swap.senderItem ? serializeItem(swap.senderItem) : null,
    receiverItem: swap.receiverItem ? serializeItem(swap.receiverItem) : null,
  };
}

export function serializeDealMessage(message: DealMessage) {
  return {
    id: message.id,
    swapId: message.swapId,
    senderId: message.senderId,
    text: message.text,
    isRead: message.isRead,
    createdAt: message.createdAt.toISOString(),
  };
}
