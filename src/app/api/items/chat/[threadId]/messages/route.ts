import { ItemStatus, NotificationType } from "@prisma/client";
import { NextRequest } from "next/server";
import { actionResponse, errorResponse, getPaging, listResponse, parseJson } from "@/lib/api";
import { checkMessageRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeItemThreadMessage } from "@/features/chat/serializers";
import { createNotification } from "@/features/notifications/create-notification";
import { publishUserEvents } from "@/lib/realtime";
import { runSerializableTransaction } from "@/lib/transactions";
import { loadItemThreadMessagePage } from "@/features/chat/message-pages";
import { markItemThreadRead } from "@/features/chat/read-state";

type Context = { params: Promise<{ threadId: string }> };

export async function GET(req: NextRequest, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { threadId } = await context.params;
  const thread = await prisma.itemThread.findUnique({ where: { id: threadId } });
  if (!thread) return errorResponse("Чат не найден", 404);

  const isParticipant = thread.buyerId === auth.userId || thread.ownerId === auth.userId;
  if (!isParticipant) return errorResponse("Нет доступа к этому чату", 403);

  await markItemThreadRead(auth.userId, threadId);

  const { limit } = getPaging(req, 40, 100);
  const before = req.nextUrl.searchParams.get("before");
  const [page, total] = await Promise.all([
    loadItemThreadMessagePage({ threadId, before, limit }),
    prisma.itemThreadMessage.count({ where: { threadId } }),
  ]);

  return listResponse(page.messages.map(serializeItemThreadMessage), { limit, offset: 0 }, total, {
    hasMore: page.hasOlder,
    nextCursor: page.nextCursor,
  });
}

export async function POST(req: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkMessageRateLimit(auth.userId);
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const { threadId } = await context.params;
  const body = await parseJson<{ text?: string }>(req);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return errorResponse("Текст сообщения не может быть пустым", 400);
  if (text.length > 2000) return errorResponse("Сообщение слишком длинное", 400);

  try {
    const result = await runSerializableTransaction(async (tx) => {
      const thread = await tx.itemThread.findUnique({
        where: { id: threadId },
        include: { item: { select: { id: true, title: true, status: true } } },
      });
      if (!thread) throw new Error("THREAD_NOT_FOUND");

      const isParticipant = thread.buyerId === auth.userId || thread.ownerId === auth.userId;
      if (!isParticipant) throw new Error("FORBIDDEN");
      if (thread.item.status !== ItemStatus.ACTIVE) throw new Error("ITEM_NOT_ACTIVE");

      const recipientId = auth.userId === thread.buyerId ? thread.ownerId : thread.buyerId;
      const blocked = await tx.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: auth.userId, blockedId: recipientId },
            { blockerId: recipientId, blockedId: auth.userId },
          ],
        },
        select: { blockerId: true },
      });
      if (blocked) throw new Error("USER_BLOCKED");

      const created = await tx.itemThreadMessage.create({
        data: { threadId, senderId: auth.userId, text },
      });
      await tx.itemThread.update({
        where: { id: threadId },
        data: { updatedAt: created.createdAt },
      });

      await createNotification(tx, {
        userId: recipientId,
        type: NotificationType.ITEM_MESSAGE_RECEIVED,
        title: "Новое сообщение",
        message: `Вам написали по объявлению «${thread.item.title}».`,
        href: `/profile/chats/item/${thread.id}`,
        entityType: "ItemThread",
        entityId: thread.id,
      });

      return { created, participantIds: [thread.buyerId, thread.ownerId] };
    });

    await publishUserEvents(result.participantIds, {
      type: "item-message",
      entityId: threadId,
    });

    return actionResponse(
      serializeItemThreadMessage(result.created),
      serializeItemThreadMessage(result.created),
      201,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "THREAD_NOT_FOUND") return errorResponse("Чат не найден", 404);
      if (error.message === "FORBIDDEN") return errorResponse("Нет доступа к этому чату", 403);
      if (error.message === "ITEM_NOT_ACTIVE") return errorResponse("Объявление больше недоступно для переписки", 409);
      if (error.message === "USER_BLOCKED") return errorResponse("Переписка с этим пользователем недоступна", 403);
    }
    return errorResponse("Не удалось отправить сообщение", 500);
  }
}
