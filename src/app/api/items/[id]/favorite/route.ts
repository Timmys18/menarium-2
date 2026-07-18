import { ItemStatus, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { actionResponse, errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/product-analytics";
import { checkRateLimit } from "@/lib/rate-limit";
import { isPrismaError } from "@/lib/transactions";
import { requireUserId } from "@/server/session";

async function checkFavoriteRateLimit(userId: string) {
  return checkRateLimit(`favorite:${userId}`, {
    limit: 30,
    windowSec: 60,
    error: "Слишком много действий. Подождите минуту и попробуйте снова.",
  });
}

async function getAvailableItem(id: string) {
  return prisma.item.findFirst({
    where: {
      id,
      status: ItemStatus.ACTIVE,
      owner: { status: UserStatus.ACTIVE },
    },
    select: { id: true, ownerId: true },
  });
}

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkFavoriteRateLimit(auth.userId);
  if (!rate.ok) {
    return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });
  }

  const { id } = await params;
  const item = await getAvailableItem(id);
  if (!item) return errorResponse("Объявление больше недоступно", 404);
  if (item.ownerId === auth.userId) return errorResponse("Нельзя сохранить своё объявление", 400);

  const communicationBlocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: auth.userId, blockedId: item.ownerId },
        { blockerId: item.ownerId, blockedId: auth.userId },
      ],
    },
    select: { blockerId: true },
  });
  if (communicationBlocked) return errorResponse("Взаимодействие с пользователем ограничено", 409);

  let created = false;
  try {
    await prisma.favorite.create({ data: { userId: auth.userId, itemId: item.id } });
    created = true;
  } catch (error) {
    if (!isPrismaError(error, "P2002")) throw error;
  }

  if (created) {
    await trackProductEvent({
      name: "item_favorited",
      actorId: auth.userId,
      entityType: "Item",
      entityId: item.id,
    });
  }

  revalidatePath("/favorites");
  return actionResponse({ favorite: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkFavoriteRateLimit(auth.userId);
  if (!rate.ok) {
    return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });
  }

  const { id } = await params;
  const removed = await prisma.favorite.deleteMany({
    where: { userId: auth.userId, itemId: id },
  });

  if (removed.count > 0) {
    await trackProductEvent({
      name: "item_unfavorited",
      actorId: auth.userId,
      entityType: "Item",
      entityId: id,
    });
  }

  revalidatePath("/favorites");
  return actionResponse({ favorite: false });
}
