import { ItemStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { actionResponse, errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/product-analytics";
import { requireUserId } from "@/server/session";

const bodySchema = z.object({
  itemId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorResponse("Некорректные данные", 400);

  const item = await prisma.item.findUnique({
    where: { id: parsed.data.itemId },
    select: { id: true, ownerId: true, status: true },
  });
  if (!item) return errorResponse("Объявление не найдено", 404);
  if (item.ownerId === auth.userId) return errorResponse("Нельзя пропустить своё объявление", 400);
  if (item.status !== ItemStatus.ACTIVE) return errorResponse("Объявление больше недоступно", 409);

  await prisma.swipePass.upsert({
    where: {
      userId_itemId: { userId: auth.userId, itemId: item.id },
    },
    create: { userId: auth.userId, itemId: item.id },
    update: {},
  });

  await trackProductEvent({
    name: "swipe_passed",
    actorId: auth.userId,
    entityType: "Item",
    entityId: item.id,
    dedupeKey: `swipe-pass:${auth.userId}:${item.id}`,
  });

  return actionResponse({ passed: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorResponse("Некорректные данные", 400);

  const removed = await prisma.swipePass.deleteMany({
    where: {
      userId: auth.userId,
      itemId: parsed.data.itemId,
    },
  });

  if (!removed.count) {
    return errorResponse("Карточка уже возвращена", 409);
  }

  await trackProductEvent({
    name: "swipe_pass_undone",
    actorId: auth.userId,
    entityType: "Item",
    entityId: parsed.data.itemId,
  });

  return actionResponse({ restored: true });
}
