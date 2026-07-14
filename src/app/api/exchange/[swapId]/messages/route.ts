import { NotificationType } from "@prisma/client";
import { NextRequest } from "next/server";
import { actionResponse, errorResponse, getPaging, listResponse, parseJson } from "@/lib/api";
import { canOpenDealChat, canWriteDealChat } from "@/lib/domain";
import { checkMessageRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeDealMessage } from "@/features/exchange/serializers";
import { createNotification } from "@/features/notifications/create-notification";
import { publishUserEvents } from "@/lib/realtime";

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

  await prisma.dealMessage.updateMany({
    where: {
      swapId,
      senderId: { not: auth.userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  const { limit, offset } = getPaging(req, 50, 100);
  const [messages, total] = await Promise.all([
    prisma.dealMessage.findMany({
      where: { swapId },
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: limit,
    }),
    prisma.dealMessage.count({ where: { swapId } }),
  ]);

  return listResponse(messages.map(serializeDealMessage), { limit, offset }, total, {
    chatClosed: !canWriteDealChat(swap.status),
  });
}

export async function POST(req: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkMessageRateLimit(auth.userId);
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const { swapId } = await context.params;
  const body = await parseJson<{ text?: string }>(req);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return errorResponse("Текст сообщения не может быть пустым", 400);
  if (text.length > 2000) return errorResponse("Сообщение слишком длинное", 400);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const swap = await tx.swapRequest.findUnique({ where: { id: swapId } });
      if (!swap) throw new Error("SWAP_NOT_FOUND");

      const isParticipant = swap.senderId === auth.userId || swap.receiverId === auth.userId;
      if (!isParticipant) throw new Error("FORBIDDEN");
      if (!canOpenDealChat(swap.status)) throw new Error("CHAT_NOT_OPEN");
      if (!canWriteDealChat(swap.status)) throw new Error("CHAT_CLOSED");

      const created = await tx.dealMessage.create({
        data: {
          swapId,
          senderId: auth.userId,
          text,
        },
      });

      const recipientId = auth.userId === swap.senderId ? swap.receiverId : swap.senderId;
      await createNotification(tx, {
        userId: recipientId,
        type: NotificationType.DEAL_MESSAGE_RECEIVED,
        title: "Новое сообщение в обмене",
        message: "Вам написали в чате сделки.",
        href: `/exchange?tab=matches&swap=${swapId}`,
        entityType: "SwapRequest",
        entityId: swapId,
      });

      return { created, recipientId, participantIds: [swap.senderId, swap.receiverId] };
    });

    await publishUserEvents(result.participantIds, {
      type: "deal-message",
      entityId: swapId,
    });

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
    }
    return errorResponse("Не удалось отправить сообщение", 500);
  }
}
