import { ItemStatus, NotificationType, SwapStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { actionResponse, errorResponse, getPaging, listResponse, parseJson } from "@/lib/api";
import { canonicalSwapPairKey } from "@/lib/domain";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeSwap } from "@/features/exchange/serializers";
import { createNotification } from "@/features/notifications/create-notification";

const swapInclude = {
  sender: { select: { id: true, name: true, city: true, image: true } },
  receiver: { select: { id: true, name: true, city: true, image: true } },
  senderItem: {
    include: {
      images: true,
      owner: { select: { id: true, name: true, city: true, image: true } },
    },
  },
  receiverItem: {
    include: {
      images: true,
      owner: { select: { id: true, name: true, city: true, image: true } },
    },
  },
} as const;

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { limit, offset } = getPaging(req);
  const where = {
    OR: [{ senderId: auth.userId }, { receiverId: auth.userId }],
  };

  const [swaps, total] = await Promise.all([
    prisma.swapRequest.findMany({
      where,
      include: swapInclude,
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.swapRequest.count({ where }),
  ]);

  return listResponse(swaps.map(serializeSwap), { limit, offset }, total);
}

const createSwapSchema = z.object({
  senderItemId: z.string().min(1),
  receiverItemId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "exchange:create");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = createSwapSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Укажите объявления для обмена", 400);

  const { senderItemId, receiverItemId } = parsed.data;
  const pairKey = canonicalSwapPairKey(senderItemId, receiverItemId);

  try {
    const swap = await prisma.$transaction(async (tx) => {
      const [senderItem, receiverItem] = await Promise.all([
        tx.item.findUnique({ where: { id: senderItemId } }),
        tx.item.findUnique({ where: { id: receiverItemId } }),
      ]);

      if (!senderItem || !receiverItem) {
        throw new Error("ITEM_NOT_FOUND");
      }
      if (senderItem.ownerId !== auth.userId) {
        throw new Error("SENDER_NOT_OWNER");
      }
      if (senderItem.ownerId === receiverItem.ownerId) {
        throw new Error("SELF_SWAP");
      }
      if (senderItem.status !== ItemStatus.ACTIVE || receiverItem.status !== ItemStatus.ACTIVE) {
        throw new Error("ITEM_NOT_ACTIVE");
      }

      const created = await tx.swapRequest.create({
        data: {
          senderId: auth.userId,
          receiverId: receiverItem.ownerId,
          senderItemId,
          receiverItemId,
          status: SwapStatus.PENDING,
          pendingPairKey: pairKey,
        },
        include: swapInclude,
      });

      await createNotification(tx, {
        userId: receiverItem.ownerId,
        type: NotificationType.SWAP_RECEIVED,
        title: "Новое предложение обмена",
        message: "Вам поступило предложение обмена.",
        href: `/exchange?swap=${created.id}`,
        entityType: "SwapRequest",
        entityId: created.id,
      });

      return created;
    });

    return actionResponse(serializeSwap(swap), {}, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ITEM_NOT_FOUND") return errorResponse("Объявление не найдено", 404);
      if (error.message === "SENDER_NOT_OWNER") return errorResponse("Вы не можете обменивать чужое объявление", 403);
      if (error.message === "SELF_SWAP") return errorResponse("Нельзя обмениваться с самим собой", 400);
      if (error.message === "ITEM_NOT_ACTIVE") return errorResponse("Одно из объявлений недоступно для обмена", 409);
      if (error.message.includes("Unique constraint")) return errorResponse("Такое предложение обмена уже существует", 409);
    }
    return errorResponse("Не удалось создать обмен", 500);
  }
}

const actionSchema = z.object({
  swapId: z.string().min(1),
  action: z.enum(["accept", "decline", "revoke", "complete", "cancel"]),
});

export async function PATCH(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const body = await parseJson(req);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Недопустимое действие", 400);

  const rate = await checkActionRateLimit(auth.userId, `exchange:${parsed.data.action}`);
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const { swapId, action } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const swap = await tx.swapRequest.findUnique({
        where: { id: swapId },
        include: { senderItem: true, receiverItem: true },
      });

      if (!swap) throw new Error("SWAP_NOT_FOUND");

      const isSender = swap.senderId === auth.userId;
      const isReceiver = swap.receiverId === auth.userId;
      if (!isSender && !isReceiver) throw new Error("FORBIDDEN");

      if (action === "accept") {
        if (!isReceiver) throw new Error("ONLY_RECEIVER");
        if (swap.status !== SwapStatus.PENDING) throw new Error("INVALID_STATUS");
        if (swap.senderItem.status !== ItemStatus.ACTIVE || swap.receiverItem.status !== ItemStatus.ACTIVE) {
          throw new Error("ITEM_NOT_ACTIVE");
        }

        await tx.item.updateMany({
          where: { id: { in: [swap.senderItemId, swap.receiverItemId] } },
          data: { status: ItemStatus.IN_DEAL },
        });

        const updated = await tx.swapRequest.update({
          where: { id: swapId },
          data: {
            status: SwapStatus.ACCEPTED,
            acceptedAt: new Date(),
            senderCompleted: false,
            receiverCompleted: false,
            pendingPairKey: null,
          },
          include: swapInclude,
        });

        await createNotification(tx, {
          userId: swap.senderId,
          type: NotificationType.SWAP_ACCEPTED,
          title: "Обмен принят",
          message: "Ваше предложение обмена принято.",
          href: `/exchange?swap=${swap.id}`,
          entityType: "SwapRequest",
          entityId: swap.id,
        });

        return updated;
      }

      if (action === "decline") {
        if (!isReceiver) throw new Error("ONLY_RECEIVER");
        if (swap.status !== SwapStatus.PENDING) throw new Error("INVALID_STATUS");
        const updated = await tx.swapRequest.update({
          where: { id: swapId },
          data: { status: SwapStatus.DECLINED, pendingPairKey: null },
          include: swapInclude,
        });
        await createNotification(tx, {
          userId: swap.senderId,
          type: NotificationType.SWAP_DECLINED,
          title: "Обмен отклонен",
          message: "Ваше предложение обмена отклонено.",
          href: `/exchange?swap=${swap.id}`,
          entityType: "SwapRequest",
          entityId: swap.id,
        });
        return updated;
      }

      if (action === "revoke") {
        if (!isSender) throw new Error("ONLY_SENDER");
        if (swap.status !== SwapStatus.PENDING) throw new Error("INVALID_STATUS");
        const updated = await tx.swapRequest.update({
          where: { id: swapId },
          data: { status: SwapStatus.CANCELLED, pendingPairKey: null },
          include: swapInclude,
        });
        await createNotification(tx, {
          userId: swap.receiverId,
          type: NotificationType.SWAP_CANCELLED,
          title: "Предложение отозвано",
          message: "Отправитель отозвал предложение обмена.",
          href: `/exchange?swap=${swap.id}`,
          entityType: "SwapRequest",
          entityId: swap.id,
        });
        return updated;
      }

      if (action === "complete") {
        if (swap.status !== SwapStatus.ACCEPTED) throw new Error("INVALID_STATUS");
        const senderCompleted = isSender ? true : swap.senderCompleted;
        const receiverCompleted = isReceiver ? true : swap.receiverCompleted;
        const shouldComplete = senderCompleted && receiverCompleted;

        if (shouldComplete) {
          await tx.item.updateMany({
            where: { id: { in: [swap.senderItemId, swap.receiverItemId] } },
            data: { status: ItemStatus.ARCHIVED },
          });
        }

        const updated = await tx.swapRequest.update({
          where: { id: swapId },
          data: {
            senderCompleted,
            receiverCompleted,
            status: shouldComplete ? SwapStatus.COMPLETED : SwapStatus.ACCEPTED,
          },
          include: swapInclude,
        });

        await createNotification(tx, {
          userId: isSender ? swap.receiverId : swap.senderId,
          type: shouldComplete ? NotificationType.SWAP_COMPLETED : NotificationType.SWAP_ACCEPTED,
          title: shouldComplete ? "Обмен завершен" : "Подтверждение обмена",
          message: shouldComplete
            ? "Обе стороны подтвердили завершение обмена."
            : "Вторая сторона подтвердила готовность завершить обмен.",
          href: `/exchange?swap=${swap.id}`,
          entityType: "SwapRequest",
          entityId: swap.id,
        });
        return updated;
      }

      if (action === "cancel") {
        if (swap.status !== SwapStatus.ACCEPTED) throw new Error("INVALID_STATUS");
        const updated = await tx.swapRequest.update({
          where: { id: swapId },
          data: { status: SwapStatus.CANCELLED },
          include: swapInclude,
        });

        const itemIds = [swap.senderItemId, swap.receiverItemId];
        for (const itemId of itemIds) {
          const otherAccepted = await tx.swapRequest.count({
            where: {
              id: { not: swap.id },
              status: SwapStatus.ACCEPTED,
              OR: [{ senderItemId: itemId }, { receiverItemId: itemId }],
            },
          });
          if (otherAccepted === 0) {
            await tx.item.update({ where: { id: itemId }, data: { status: ItemStatus.ACTIVE } });
          }
        }

        await createNotification(tx, {
          userId: isSender ? swap.receiverId : swap.senderId,
          type: NotificationType.SWAP_CANCELLED,
          title: "Обмен отменен",
          message: "Вторая сторона отменила активный обмен.",
          href: `/exchange?swap=${swap.id}`,
          entityType: "SwapRequest",
          entityId: swap.id,
        });
        return updated;
      }

      throw new Error("INVALID_ACTION");
    });

    return actionResponse(serializeSwap(result), serializeSwap(result));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SWAP_NOT_FOUND") return errorResponse("Обмен не найден", 404);
      if (error.message === "FORBIDDEN") return errorResponse("Вы не можете управлять этим обменом", 403);
      if (error.message === "ONLY_RECEIVER") return errorResponse("Это действие доступно только получателю", 403);
      if (error.message === "ONLY_SENDER") return errorResponse("Это действие доступно только отправителю", 403);
      if (error.message === "ITEM_NOT_ACTIVE") return errorResponse("Одно из объявлений уже участвует в другой сделке", 409);
      if (error.message === "INVALID_STATUS") return errorResponse("Действие недоступно в текущем статусе обмена", 409);
    }
    return errorResponse("Не удалось обновить обмен", 500);
  }
}
