import { ChatKind } from "@prisma/client";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publishUserEvent } from "@/lib/realtime";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUserId } from "@/server/session";

const activitySchema = z.object({
  kind: z.enum([ChatKind.DEAL, ChatKind.ITEM]),
  entityId: z.string().min(1).max(128),
  typing: z.boolean(),
});

export async function POST(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const parsed = activitySchema.safeParse(await parseJson(req));
  if (!parsed.success) return errorResponse("Некорректный чат", 400);
  const rate = await checkRateLimit(`chat-activity:${auth.userId}`, {
    limit: 40,
    windowSec: 60,
    error: "Слишком много обновлений чата",
  });
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  let recipientId: string | null = null;
  if (parsed.data.kind === ChatKind.DEAL) {
    const swap = await prisma.swapRequest.findFirst({
      where: {
        id: parsed.data.entityId,
        OR: [{ senderId: auth.userId }, { receiverId: auth.userId }],
      },
      select: { senderId: true, receiverId: true },
    });
    if (swap) recipientId = swap.senderId === auth.userId ? swap.receiverId : swap.senderId;
  } else {
    const thread = await prisma.itemThread.findFirst({
      where: {
        id: parsed.data.entityId,
        OR: [{ buyerId: auth.userId }, { ownerId: auth.userId }],
      },
      select: { buyerId: true, ownerId: true },
    });
    if (thread) recipientId = thread.buyerId === auth.userId ? thread.ownerId : thread.buyerId;
  }

  if (!recipientId) return errorResponse("Нет доступа к этому чату", 403);
  await publishUserEvent(recipientId, {
    type: "chat-typing",
    entityId: parsed.data.entityId,
    actorId: auth.userId,
    state: parsed.data.typing ? "active" : "idle",
  });
  return actionResponse({ delivered: true });
}
