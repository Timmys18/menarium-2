import { ItemStatus, UserStatus } from "@prisma/client";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUserId } from "@/server/session";

export const runtime = "nodejs";

const MAX_VIEW_HISTORY = 50;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkRateLimit(`item-view:${auth.userId}`, {
    limit: 120,
    windowSec: 60 * 60,
    error: "Слишком много просмотров. Попробуйте позже.",
  });
  if (!rate.ok) {
    return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });
  }

  const { id } = await params;
  const item = await prisma.item.findFirst({
    where: {
      id,
      status: ItemStatus.ACTIVE,
      owner: { status: UserStatus.ACTIVE },
    },
    select: { id: true, ownerId: true },
  });
  if (!item || item.ownerId === auth.userId) return new Response(null, { status: 204 });

  const blocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: auth.userId, blockedId: item.ownerId },
        { blockerId: item.ownerId, blockedId: auth.userId },
      ],
    },
    select: { blockerId: true },
  });
  if (blocked) return new Response(null, { status: 204 });

  await prisma.$transaction(async (tx) => {
    await tx.itemView.upsert({
      where: { userId_itemId: { userId: auth.userId, itemId: item.id } },
      create: { userId: auth.userId, itemId: item.id },
      update: { viewedAt: new Date() },
    });

    const staleViews = await tx.itemView.findMany({
      where: { userId: auth.userId },
      select: { itemId: true },
      orderBy: [{ viewedAt: "desc" }, { itemId: "desc" }],
      skip: MAX_VIEW_HISTORY,
    });
    if (staleViews.length > 0) {
      await tx.itemView.deleteMany({
        where: {
          userId: auth.userId,
          itemId: { in: staleViews.map((view) => view.itemId) },
        },
      });
    }
  });

  return new Response(null, { status: 204 });
}
