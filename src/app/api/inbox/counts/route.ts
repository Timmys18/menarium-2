import { SwapStatus } from "@prisma/client";
import { actionResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";

export async function GET() {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const [unreadCount, pendingSwaps] = await Promise.all([
    prisma.notification.count({ where: { userId: auth.userId, isRead: false } }),
    prisma.swapRequest.count({ where: { receiverId: auth.userId, status: SwapStatus.PENDING } }),
  ]);

  return actionResponse({ unreadCount, pendingSwaps, inboxBadge: unreadCount });
}
