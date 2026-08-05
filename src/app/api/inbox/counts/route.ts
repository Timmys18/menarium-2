import { SwapStatus } from "@prisma/client";
import { actionResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";

export async function GET() {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const [unreadNotifications, unreadDealMessages, unreadItemMessages, pendingSwaps] = await Promise.all([
    prisma.notification.count({ where: { userId: auth.userId, isRead: false } }),
    prisma.dealMessage.count({
      where: {
        senderId: { not: auth.userId },
        isRead: false,
        swap: { OR: [{ senderId: auth.userId }, { receiverId: auth.userId }] },
      },
    }),
    prisma.itemThreadMessage.count({
      where: {
        senderId: { not: auth.userId },
        isRead: false,
        thread: { OR: [{ buyerId: auth.userId }, { ownerId: auth.userId }] },
      },
    }),
    prisma.swapRequest.count({ where: { receiverId: auth.userId, status: SwapStatus.PENDING } }),
  ]);

  return actionResponse({
    unreadNotifications,
    unreadMessages: unreadDealMessages + unreadItemMessages,
    pendingSwaps,
  });
}
