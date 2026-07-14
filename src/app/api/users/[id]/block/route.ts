import { SwapStatus, UserStatus } from "@prisma/client";
import { actionResponse, errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { publishUserEvents } from "@/lib/realtime";
import { requireUserId } from "@/server/session";

type Context = { params: Promise<{ id: string }> };

export async function PUT(_: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (id === auth.userId) return errorResponse("Нельзя заблокировать себя", 400);

  const rate = await checkActionRateLimit(auth.userId, `users:block:${id}`);
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const target = await prisma.user.findFirst({
    where: { id, status: { not: UserStatus.DELETED } },
    select: { id: true },
  });
  if (!target) return errorResponse("Пользователь не найден", 404);

  await prisma.$transaction(async (tx) => {
    await tx.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: auth.userId, blockedId: id } },
      update: {},
      create: { blockerId: auth.userId, blockedId: id },
    });
    await tx.swapRequest.updateMany({
      where: {
        status: SwapStatus.PENDING,
        OR: [
          { senderId: auth.userId, receiverId: id },
          { senderId: id, receiverId: auth.userId },
        ],
      },
      data: { status: SwapStatus.CANCELLED, pendingPairKey: null },
    });
  });

  await publishUserEvents([auth.userId, id], { type: "swap" });
  return actionResponse(
    { blocked: true },
    { message: "Пользователь заблокирован. Ожидающие предложения отменены, новые контакты недоступны." },
  );
}

export async function DELETE(_: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const rate = await checkActionRateLimit(auth.userId, `users:unblock:${id}`);
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  await prisma.userBlock.deleteMany({
    where: { blockerId: auth.userId, blockedId: id },
  });

  await publishUserEvents([auth.userId, id], { type: "counts" });
  return actionResponse({ blocked: false }, { message: "Пользователь разблокирован." });
}
