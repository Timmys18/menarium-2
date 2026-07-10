import { ItemStatus } from "@prisma/client";
import { actionResponse, errorResponse } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeItemThread } from "@/features/chat/serializers";

type Context = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "item-chat:open");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const { id } = await context.params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return errorResponse("Объявление не найдено", 404);
  if (item.ownerId === auth.userId) return errorResponse("Нельзя открыть чат с самим собой", 400);
  if (item.status !== ItemStatus.ACTIVE) {
    return errorResponse("Объявление недоступно для новых сообщений", 409);
  }

  const thread = await prisma.itemThread.upsert({
    where: { itemId_buyerId: { itemId: item.id, buyerId: auth.userId } },
    create: {
      itemId: item.id,
      buyerId: auth.userId,
      ownerId: item.ownerId,
    },
    update: { updatedAt: new Date() },
  });

  return actionResponse(serializeItemThread(thread), serializeItemThread(thread), 201);
}
