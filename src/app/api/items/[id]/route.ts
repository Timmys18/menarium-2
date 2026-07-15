import { ItemStatus, SwapStatus } from "@prisma/client";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdentity, requireUserId } from "@/server/session";
import { serializeItem } from "@/features/items/serializers";
import { itemPayloadSchema } from "@/features/items/validation";
import { visibleItemWhere } from "@/features/items/visibility";
import { isAdminEmail } from "@/server/admin";
import { claimItemMedia, INVALID_ITEM_MEDIA } from "@/features/media/item-media";
import { deleteMediaObjects } from "@/features/media/cleanup";
import { runSerializableTransaction } from "@/lib/transactions";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;
  const identity = await getCurrentUserIdentity();
  const viewer = identity ? { id: identity.id, isAdmin: isAdminEmail(identity.email) } : null;
  const item = await prisma.item.findFirst({
    where: visibleItemWhere(id, viewer),
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
  try {
    const result = await runSerializableTransaction(async (tx) => {
      const current = await tx.item.findFirst({
        where: {
          id,
          ownerId: auth.userId,
          status: ItemStatus.ACTIVE,
        },
        include: { images: true },
      });
      if (!current) throw new Error("ITEM_NOT_EDITABLE");

      const submittedImageIds = data.images.map((image) => image.id);
      await claimItemMedia(tx, {
        imageIds: submittedImageIds,
        userId: auth.userId,
        itemId: id,
        allowCurrentItem: true,
      });

      const removedAssets = current.images.filter(
        (image) => !submittedImageIds.includes(image.id),
      );
      if (removedAssets.length) {
        await tx.mediaAsset.deleteMany({
          where: { id: { in: removedAssets.map((image) => image.id) }, itemId: id },
        });
      }

      const changed = await tx.item.updateMany({
        where: { id, ownerId: auth.userId, status: ItemStatus.ACTIVE },
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
      if (changed.count !== 1) throw new Error("ITEM_NOT_EDITABLE");

      const updated = await tx.item.findUniqueOrThrow({
        where: { id },
        include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
      });
      return { updated, removedKeys: removedAssets.map((image) => image.key) };
    });

    await deleteMediaObjects(result.removedKeys);
    return actionResponse(serializeItem(result.updated), serializeItem(result.updated));
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_ITEM_MEDIA) {
      return errorResponse("Одно или несколько изображений недоступны. Загрузите их заново", 400);
    }
    if (error instanceof Error && error.message === "ITEM_NOT_EDITABLE") {
      return errorResponse("Объявление изменилось и больше недоступно для редактирования", 409);
    }
    console.error("[items] update failed:", error);
    return errorResponse("Не удалось сохранить объявление", 500);
  }
}

export async function DELETE(_: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.item.findUnique({ where: { id }, include: { images: true } });
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
  await deleteMediaObjects(existing.images.map((image) => image.key));
  return actionResponse({ deleted: true });
}
