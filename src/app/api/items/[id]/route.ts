import { ItemStatus, SwapStatus } from "@prisma/client";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeItem } from "@/features/items/serializers";
import { itemPayloadSchema } from "@/features/items/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
  });

  if (!item) return errorResponse("Объявление не найдено", 404);
  return actionResponse(serializeItem(item), serializeItem(item));
}

export async function PATCH(req: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.item.findUnique({ where: { id }, include: { images: true } });
  if (!existing) return errorResponse("Объявление не найдено", 404);
  if (existing.ownerId !== auth.userId) return errorResponse("Вы не можете редактировать чужое объявление", 403);
  if (existing.status !== ItemStatus.ACTIVE) {
    return errorResponse("Редактировать можно только активное объявление", 409);
  }

  const body = await parseJson(req);
  const parsed = itemPayloadSchema.safeParse(body);
  if (!parsed.success) return errorResponse(z.prettifyError(parsed.error), 400);

  const rate = await checkActionRateLimit(auth.userId, "items:update");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const data = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    const submittedImageIds = data.images.map((image) => image.id);
    await tx.mediaAsset.deleteMany({
      where: {
        itemId: id,
        ...(submittedImageIds.length ? { id: { notIn: submittedImageIds } } : {}),
      },
    });

    await tx.item.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        category: data.category,
        description: data.description,
        city: data.city,
        isOnline: data.isOnline,
        desired: data.desired,
        acceptsAnything: data.acceptsAnything,
        extraOfferText: data.extraOfferText || null,
      },
    });

    if (submittedImageIds.length) {
      await tx.mediaAsset.updateMany({
        where: {
          id: { in: submittedImageIds },
          ownerId: auth.userId,
          OR: [{ itemId: null }, { itemId: id }],
        },
        data: { itemId: id, ownerType: "ITEM" },
      });
    }

    return tx.item.findUniqueOrThrow({
      where: { id },
      include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
    });
  });

  return actionResponse(serializeItem(updated), serializeItem(updated));
}

export async function DELETE(_: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return errorResponse("Объявление не найдено", 404);
  if (existing.ownerId !== auth.userId) return errorResponse("Вы не можете удалить чужое объявление", 403);

  const blockingSwaps = await prisma.swapRequest.count({
    where: {
      status: { in: [SwapStatus.PENDING, SwapStatus.ACCEPTED] },
      OR: [{ senderItemId: id }, { receiverItemId: id }],
    },
  });

  if (blockingSwaps > 0) {
    return errorResponse("Нельзя удалить объявление, пока по нему есть активные или ожидающие обмены", 409);
  }

  const historySwaps = await prisma.swapRequest.count({
    where: {
      status: SwapStatus.COMPLETED,
      OR: [{ senderItemId: id }, { receiverItemId: id }],
    },
  });

  if (historySwaps > 0) {
    if (existing.status !== ItemStatus.ARCHIVED) {
      await prisma.item.update({ where: { id }, data: { status: ItemStatus.ARCHIVED } });
      return actionResponse({ archived: true, message: "Объявление снято с публикации — в истории обменов оно сохранится." });
    }
    return errorResponse("Объявление уже в архиве и связано с завершёнными обменами", 409);
  }

  await prisma.item.delete({ where: { id } });
  return actionResponse({ deleted: true });
}
