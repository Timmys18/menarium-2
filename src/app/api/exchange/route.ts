import { ItemStatus, NotificationType, SwapStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { actionResponse, errorResponse, getPaging, listResponse, parseJson } from "@/lib/api";
import { pendingSwapOfferKey } from "@/lib/domain";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeSwap } from "@/features/exchange/serializers";
import { createNotification } from "@/features/notifications/create-notification";
import { trackProductEvent } from "@/lib/product-analytics";
import { publishUserEvents } from "@/lib/realtime";
import { isPrismaError, runSerializableTransaction } from "@/lib/transactions";

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
  const pairKey = pendingSwapOfferKey(senderItemId, receiverItemId);

  try {
    const swap = await runSerializableTransaction(async (tx) => {
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

      const blocked = await tx.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: auth.userId, blockedId: receiverItem.ownerId },
            { blockerId: receiverItem.ownerId, blockedId: auth.userId },
          ],
        },
        select: { blockerId: true },
      });
      if (blocked) throw new Error("USER_BLOCKED");

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
        href: `/exchange?tab=incoming&swap=${created.id}`,
        entityType: "SwapRequest",
        entityId: created.id,
      });

      return created;
    });

    await publishUserEvents([swap.senderId, swap.receiverId], {
      type: "swap",
      entityId: swap.id,
    });
    await trackProductEvent({
      name: "swap_proposed",
      actorId: auth.userId,
      entityType: "SwapRequest",
      entityId: swap.id,
      dedupeKey: `swap:${swap.id}:proposed`,
    });

    return actionResponse(serializeSwap(swap), {}, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ITEM_NOT_FOUND") return errorResponse("Объявление не найдено", 404);
      if (error.message === "SENDER_NOT_OWNER") return errorResponse("Вы не можете обменивать чужое объявление", 403);
      if (error.message === "SELF_SWAP") return errorResponse("Нельзя обмениваться с самим собой", 400);
      if (error.message === "ITEM_NOT_ACTIVE") return errorResponse("Одно из объявлений недоступно для обмена", 409);
      if (error.message === "USER_BLOCKED") return errorResponse("Предложение этому пользователю недоступно", 403);
    }
    if (isPrismaError(error, "P2002")) return errorResponse("Такое предложение обмена уже существует", 409);
    if (isPrismaError(error, "P2034")) return errorResponse("Данные изменились. Повторите предложение ещё раз", 409);
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
    const realtimeUserIds = new Set<string>();
    const result = await runSerializableTransaction(async (tx) => {
      // A serialization retry must publish only the events from the committed attempt.
      realtimeUserIds.clear();
      const swap = await tx.swapRequest.findUnique({
        where: { id: swapId },
        include: { senderItem: true, receiverItem: true },
      });

      if (!swap) throw new Error("SWAP_NOT_FOUND");

      const isSender = swap.senderId === auth.userId;
      const isReceiver = swap.receiverId === auth.userId;
      if (!isSender && !isReceiver) throw new Error("FORBIDDEN");
      realtimeUserIds.add(swap.senderId);
      realtimeUserIds.add(swap.receiverId);

      if (action === "accept") {
        if (!isReceiver) throw new Error("ONLY_RECEIVER");
        if (swap.status !== SwapStatus.PENDING) throw new Error("INVALID_STATUS");

        // Атомарно: переводим оба объявления в IN_DEAL, только если они ещё ACTIVE.
        // Условие по статусу + проверка count === 2 закрывает гонку, когда
        // два параллельных accept пытаются занять одно и то же объявление.
        const itemsUpdated = await tx.item.updateMany({
          where: { id: { in: [swap.senderItemId, swap.receiverItemId] }, status: ItemStatus.ACTIVE },
          data: { status: ItemStatus.IN_DEAL },
        });
        if (itemsUpdated.count !== 2) {
          throw new Error("ITEM_NOT_ACTIVE");
        }

        // Атомарно переводим сам свап PENDING -> ACCEPTED. Если в этот момент его
        // уже кто-то перевёл (двойной accept), count будет 0 -> откатываемся.
        const swapUpdated = await tx.swapRequest.updateMany({
          where: { id: swapId, status: SwapStatus.PENDING },
          data: {
            status: SwapStatus.ACCEPTED,
            acceptedAt: new Date(),
            senderCompleted: false,
            receiverCompleted: false,
            pendingPairKey: null,
          },
        });
        if (swapUpdated.count !== 1) {
          throw new Error("INVALID_STATUS");
        }

        // Автоматически отклоняем прочие PENDING-предложения, которые затрагивают
        // любое из этих двух объявлений — они больше не могут быть приняты.
        const affectedItemIds = [swap.senderItemId, swap.receiverItemId];
        const competing = await tx.swapRequest.findMany({
          where: {
            id: { not: swapId },
            status: SwapStatus.PENDING,
            OR: [
              { senderItemId: { in: affectedItemIds } },
              { receiverItemId: { in: affectedItemIds } },
            ],
          },
          select: { id: true, senderId: true },
        });

        if (competing.length) {
          for (const entry of competing) {
            const declined = await tx.swapRequest.updateMany({
              where: { id: entry.id, status: SwapStatus.PENDING },
              data: { status: SwapStatus.DECLINED, pendingPairKey: null },
            });
            if (declined.count !== 1) continue;

            realtimeUserIds.add(entry.senderId);
            await createNotification(tx, {
              userId: entry.senderId,
              type: NotificationType.SWAP_DECLINED,
              title: "Объявление больше недоступно",
              message: "Объявление уже участвует в другом обмене, ваше предложение отклонено.",
              href: `/exchange?tab=outgoing&swap=${entry.id}`,
              entityType: "SwapRequest",
              entityId: entry.id,
            });
          }
        }

        const updated = await tx.swapRequest.findUniqueOrThrow({
          where: { id: swapId },
          include: swapInclude,
        });

        await createNotification(tx, {
          userId: swap.senderId,
          type: NotificationType.SWAP_ACCEPTED,
          title: "Обмен принят",
          message: "Ваше предложение обмена принято.",
          href: `/exchange?tab=matches&swap=${swap.id}`,
          entityType: "SwapRequest",
          entityId: swap.id,
        });

        return updated;
      }

      if (action === "decline") {
        if (!isReceiver) throw new Error("ONLY_RECEIVER");
        if (swap.status !== SwapStatus.PENDING) throw new Error("INVALID_STATUS");
        const declined = await tx.swapRequest.updateMany({
          where: { id: swapId, status: SwapStatus.PENDING },
          data: { status: SwapStatus.DECLINED, pendingPairKey: null },
        });
        if (declined.count !== 1) throw new Error("INVALID_STATUS");

        const updated = await tx.swapRequest.findUniqueOrThrow({
          where: { id: swapId },
          include: swapInclude,
        });
        await createNotification(tx, {
          userId: swap.senderId,
          type: NotificationType.SWAP_DECLINED,
          title: "Обмен отклонен",
          message: "Ваше предложение обмена отклонено.",
          href: `/exchange?tab=outgoing&swap=${swap.id}`,
          entityType: "SwapRequest",
          entityId: swap.id,
        });
        return updated;
      }

      if (action === "revoke") {
        if (!isSender) throw new Error("ONLY_SENDER");
        if (swap.status !== SwapStatus.PENDING) throw new Error("INVALID_STATUS");
        const revoked = await tx.swapRequest.updateMany({
          where: { id: swapId, status: SwapStatus.PENDING },
          data: { status: SwapStatus.CANCELLED, pendingPairKey: null },
        });
        if (revoked.count !== 1) throw new Error("INVALID_STATUS");

        const updated = await tx.swapRequest.findUniqueOrThrow({
          where: { id: swapId },
          include: swapInclude,
        });
        await createNotification(tx, {
          userId: swap.receiverId,
          type: NotificationType.SWAP_CANCELLED,
          title: "Предложение отозвано",
          message: "Отправитель отозвал предложение обмена.",
          href: `/exchange?tab=incoming&swap=${swap.id}`,
          entityType: "SwapRequest",
          entityId: swap.id,
        });
        return updated;
      }

      if (action === "complete") {
        if (swap.status !== SwapStatus.ACCEPTED) throw new Error("INVALID_STATUS");

        const alreadyConfirmed = isSender ? swap.senderCompleted : swap.receiverCompleted;
        // Идемпотентность: повторное подтверждение той же стороной ничего не меняет
        // и не должно плодить дубли уведомлений.
        if (alreadyConfirmed) {
          return tx.swapRequest.findUniqueOrThrow({ where: { id: swapId }, include: swapInclude });
        }

        const confirmation = await tx.swapRequest.updateMany({
          where: {
            id: swapId,
            status: SwapStatus.ACCEPTED,
            ...(isSender ? { senderCompleted: false } : { receiverCompleted: false }),
          },
          data: isSender ? { senderCompleted: true } : { receiverCompleted: true },
        });
        if (confirmation.count !== 1) throw new Error("INVALID_STATUS");

        const confirmed = await tx.swapRequest.findUniqueOrThrow({ where: { id: swapId } });
        const shouldComplete = confirmed.senderCompleted && confirmed.receiverCompleted;

        if (shouldComplete) {
          const completed = await tx.swapRequest.updateMany({
            where: {
              id: swapId,
              status: SwapStatus.ACCEPTED,
              senderCompleted: true,
              receiverCompleted: true,
            },
            data: { status: SwapStatus.COMPLETED, completedAt: new Date() },
          });
          if (completed.count !== 1) throw new Error("INVALID_STATUS");

          const archivedItems = await tx.item.updateMany({
            where: {
              id: { in: [swap.senderItemId, swap.receiverItemId] },
              status: ItemStatus.IN_DEAL,
            },
            data: { status: ItemStatus.ARCHIVED },
          });
          if (archivedItems.count !== 2) throw new Error("ITEM_STATE_INVALID");
        }

        const updated = await tx.swapRequest.findUniqueOrThrow({
          where: { id: swapId },
          include: swapInclude,
        });

        await createNotification(tx, {
          userId: isSender ? swap.receiverId : swap.senderId,
          type: shouldComplete ? NotificationType.SWAP_COMPLETED : NotificationType.SWAP_ACCEPTED,
          title: shouldComplete ? "Обмен завершен" : "Партнёр подтвердил завершение",
          message: shouldComplete
            ? "Обе стороны подтвердили завершение обмена."
            : "Вторая сторона подтвердила готовность завершить обмен. Подтвердите и вы.",
          href: `/exchange?tab=matches&swap=${swap.id}`,
          entityType: "SwapRequest",
          entityId: swap.id,
        });
        return updated;
      }

      if (action === "cancel") {
        if (swap.status !== SwapStatus.ACCEPTED) throw new Error("INVALID_STATUS");
        const cancelled = await tx.swapRequest.updateMany({
          where: { id: swapId, status: SwapStatus.ACCEPTED },
          data: { status: SwapStatus.CANCELLED },
        });
        if (cancelled.count !== 1) throw new Error("INVALID_STATUS");

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
            await tx.item.updateMany({
              where: { id: itemId, status: ItemStatus.IN_DEAL },
              data: { status: ItemStatus.ACTIVE },
            });
          }
        }

        const updated = await tx.swapRequest.findUniqueOrThrow({
          where: { id: swapId },
          include: swapInclude,
        });

        await createNotification(tx, {
          userId: isSender ? swap.receiverId : swap.senderId,
          type: NotificationType.SWAP_CANCELLED,
          title: "Обмен отменен",
          message: "Вторая сторона отменила активный обмен.",
          href: `/exchange?tab=matches&swap=${swap.id}`,
          entityType: "SwapRequest",
          entityId: swap.id,
        });
        return updated;
      }

      throw new Error("INVALID_ACTION");
    });

    await publishUserEvents([...realtimeUserIds], {
      type: "swap",
      entityId: result.id,
    });

    if (action === "complete") {
      await trackProductEvent({
        name: "swap_completion_confirmed",
        actorId: auth.userId,
        entityType: "SwapRequest",
        entityId: result.id,
        dedupeKey: `swap:${result.id}:completion-confirmed:${auth.userId}`,
      });
      if (result.status === SwapStatus.COMPLETED) {
        await trackProductEvent({
          name: "swap_completed",
          actorId: auth.userId,
          entityType: "SwapRequest",
          entityId: result.id,
          dedupeKey: `swap:${result.id}:completed`,
        });
      }
    } else {
      const eventName = {
        accept: "swap_accepted",
        decline: "swap_declined",
        revoke: "swap_revoked",
        cancel: "swap_cancelled",
      }[action] as "swap_accepted" | "swap_declined" | "swap_revoked" | "swap_cancelled";

      await trackProductEvent({
        name: eventName,
        actorId: auth.userId,
        entityType: "SwapRequest",
        entityId: result.id,
        dedupeKey: `swap:${result.id}:${action}`,
      });
    }

    return actionResponse(serializeSwap(result), serializeSwap(result));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SWAP_NOT_FOUND") return errorResponse("Обмен не найден", 404);
      if (error.message === "FORBIDDEN") return errorResponse("Вы не можете управлять этим обменом", 403);
      if (error.message === "ONLY_RECEIVER") return errorResponse("Это действие доступно только получателю", 403);
      if (error.message === "ONLY_SENDER") return errorResponse("Это действие доступно только отправителю", 403);
      if (error.message === "ITEM_NOT_ACTIVE") return errorResponse("Одно из объявлений уже участвует в другой сделке", 409);
      if (error.message === "ITEM_STATE_INVALID") return errorResponse("Состояние объявлений изменилось. Обновите страницу", 409);
      if (error.message === "INVALID_STATUS") return errorResponse("Действие недоступно в текущем статусе обмена", 409);
    }
    if (isPrismaError(error, "P2034")) return errorResponse("Обмен изменился параллельно. Повторите действие", 409);
    return errorResponse("Не удалось обновить обмен", 500);
  }
}
