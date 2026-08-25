import { ChatKind, NotificationType } from "@prisma/client";
import { NextRequest } from "next/server";
import { actionResponse, errorResponse, getPaging, listResponse, parseJson } from "@/lib/api";
import { canOpenDealChat, canWriteDealChat } from "@/lib/domain";
import { checkMessageRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeDealMessage } from "@/features/exchange/serializers";
import { createNotification } from "@/features/notifications/create-notification";
import { publishUserEvents } from "@/lib/realtime";
import { runSerializableTransaction } from "@/lib/transactions";
import { loadDealMessagePage, messageRelations } from "@/features/chat/message-pages";
import { markDealChatRead } from "@/features/chat/read-state";
import { claimChatMedia, INVALID_CHAT_MEDIA, MAX_CHAT_IMAGES } from "@/features/chat/media";
import { sendChatPush } from "@/lib/push";
import { reportError } from "@/lib/logger";

type Context = { params: Promise<{ swapId: string }> };

export async function GET(req: NextRequest, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { swapId } = await context.params;
  const swap = await prisma.swapRequest.findUnique({ where: { id: swapId } });
  if (!swap) return errorResponse("Обмен не найден", 404);

  const isParticipant = swap.senderId === auth.userId || swap.receiverId === auth.userId;
  if (!isParticipant) return errorResponse("Нет доступа к этому чату", 403);
  if (!canOpenDealChat(swap.status)) return errorResponse("Чат доступен только после принятия обмена", 403);

  await markDealChatRead(auth.userId, swapId);

  const { limit } = getPaging(req, 40, 100);
  const before = req.nextUrl.searchParams.get("before");
  const [page, total] = await Promise.all([
    loadDealMessagePage({ swapId, before, limit }),
    prisma.dealMessage.count({ where: { swapId } }),
  ]);

  return listResponse(page.messages.map(serializeDealMessage), { limit, offset: 0 }, total, {
    hasMore: page.hasOlder,
    nextCursor: page.nextCursor,
    chatClosed: !canWriteDealChat(swap.status),
  });
}

export async function POST(req: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkMessageRateLimit(auth.userId);
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const { swapId } = await context.params;
  const body = await parseJson<{ text?: string; imageIds?: unknown; replyToId?: unknown }>(req);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const imageIds = Array.isArray(body.imageIds)
    ? body.imageIds.filter((id): id is string => typeof id === "string")
    : [];
  const replyToId = typeof body.replyToId === "string" ? body.replyToId.trim() : null;
  if (!text && imageIds.length === 0) return errorResponse("Добавьте текст или фотографию", 400);
  if (text.length > 2000) return errorResponse("Сообщение слишком длинное", 400);
  if (imageIds.length > MAX_CHAT_IMAGES || imageIds.length !== new Set(imageIds).size) {
    return errorResponse(`К сообщению можно добавить до ${MAX_CHAT_IMAGES} фотографий`, 400);
  }

  try {
    const result = await runSerializableTransaction(async (tx) => {
      const swap = await tx.swapRequest.findUnique({ where: { id: swapId } });
      if (!swap) throw new Error("SWAP_NOT_FOUND");

      const isParticipant = swap.senderId === auth.userId || swap.receiverId === auth.userId;
      if (!isParticipant) throw new Error("FORBIDDEN");
      if (!canOpenDealChat(swap.status)) throw new Error("CHAT_NOT_OPEN");
      if (!canWriteDealChat(swap.status)) throw new Error("CHAT_CLOSED");

      const recipientId = auth.userId === swap.senderId ? swap.receiverId : swap.senderId;
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
      if (replyToId) {
        const replyExists = await tx.dealMessage.findFirst({
          where: { id: replyToId, swapId },
          select: { id: true },
        });
        if (!replyExists) throw new Error("INVALID_REPLY");
      }

      const created = await tx.dealMessage.create({
        data: {
          swapId,
          senderId: auth.userId,
          text,
          replyToId,
        },
      });
      await claimChatMedia(tx, {
        imageIds,
        userId: auth.userId,
        messageId: created.id,
        kind: "deal",
      });

      await tx.swapRequest.update({
        where: { id: swapId },
        data: { updatedAt: created.createdAt },
      });

      await createNotification(tx, {
        userId: recipientId,
        type: NotificationType.DEAL_MESSAGE_RECEIVED,
        title: "Новое сообщение в обмене",
        message: "Вам написали в чате обмена.",
        href: `/exchange?tab=matches&swap=${swapId}`,
        entityType: "SwapRequest",
        entityId: swapId,
        coalesceUnread: true,
      });

      const hydrated = await tx.dealMessage.findUniqueOrThrow({
        where: { id: created.id },
        include: messageRelations,
      });
      return { created: hydrated, recipientId, participantIds: [swap.senderId, swap.receiverId] };
    });

    await publishUserEvents(result.participantIds, {
      type: "deal-message",
      entityId: swapId,
    });
    await sendChatPush({
      userId: result.recipientId,
      kind: ChatKind.DEAL,
      entityId: swapId,
      payload: {
        title: "Новое сообщение в обмене",
        body: text ? text.slice(0, 140) : "Вам отправили фотографию",
        href: `/exchange?tab=matches&swap=${swapId}`,
        tag: `deal-${swapId}`,
      },
    }).catch((error) => reportError("push.deal_message_failed", error, { swapId }));

    return actionResponse(
      serializeDealMessage(result.created),
      serializeDealMessage(result.created),
      201,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SWAP_NOT_FOUND") return errorResponse("Обмен не найден", 404);
      if (error.message === "FORBIDDEN") return errorResponse("Нет доступа к этому чату", 403);
      if (error.message === "CHAT_NOT_OPEN") return errorResponse("Чат доступен только после принятия обмена", 403);
      if (error.message === "CHAT_CLOSED") return errorResponse("Обмен завершен. Чат закрыт для новых сообщений", 409);
      if (error.message === "USER_BLOCKED") return errorResponse("Переписка с этим пользователем недоступна", 403);
      if (error.message === "INVALID_REPLY") return errorResponse("Сообщение для ответа не найдено", 400);
      if (error.message === INVALID_CHAT_MEDIA) return errorResponse("Не удалось прикрепить фотографии", 400);
    }
    return errorResponse("Не удалось отправить сообщение", 500);
  }
}
