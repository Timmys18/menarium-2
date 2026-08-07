import { ItemStatus, SwapStatus, UserStatus } from "@prisma/client";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publishUserEvents } from "@/lib/realtime";
import { recordAdminAction } from "@/server/admin-audit";
import { requireAdmin } from "@/server/admin";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function PATCH(req: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin.ok) return errorResponse("Доступ запрещён", 403);

  const { id } = await context.params;
  if (id === admin.admin.id) return errorResponse("Нельзя изменить статус собственного аккаунта", 400);

  const parsed = schema.safeParse(await parseJson(req));
  if (!parsed.success) return errorResponse("Проверьте статус и причину", 400);
  if (parsed.data.status === "SUSPENDED" && !parsed.data.reason) {
    return errorResponse("Укажите причину блокировки", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!user || user.status === UserStatus.DELETED) return errorResponse("Пользователь не найден", 404);

  const affectedUsers = new Set<string>([id]);
  const updated = await prisma.$transaction(async (tx) => {
    if (parsed.data.status === "SUSPENDED") {
      const activeSwaps = await tx.swapRequest.findMany({
        where: {
          status: { in: [SwapStatus.PENDING, SwapStatus.ACCEPTED] },
          OR: [{ senderId: id }, { receiverId: id }],
        },
        select: {
          id: true,
          status: true,
          senderId: true,
          receiverId: true,
          senderItemId: true,
          receiverItemId: true,
        },
      });

      for (const swap of activeSwaps) {
        affectedUsers.add(swap.senderId);
        affectedUsers.add(swap.receiverId);
      }

      await tx.swapRequest.updateMany({
        where: { id: { in: activeSwaps.map((swap) => swap.id) } },
        data: { status: SwapStatus.CANCELLED, pendingPairKey: null },
      });

      const counterpartItemIds = activeSwaps.flatMap((swap) => [
        swap.senderId === id ? swap.receiverItemId : swap.senderItemId,
      ]);
      await tx.item.updateMany({
        where: {
          id: { in: counterpartItemIds },
          status: ItemStatus.IN_DEAL,
          owner: { status: UserStatus.ACTIVE },
        },
        data: { status: ItemStatus.ACTIVE },
      });
      await tx.item.updateMany({
        where: { ownerId: id, status: { not: ItemStatus.ARCHIVED } },
        data: { status: ItemStatus.ARCHIVED },
      });
    }

    const result = await tx.user.update({
      where: { id },
      data:
        parsed.data.status === "SUSPENDED"
          ? {
              status: UserStatus.SUSPENDED,
              suspendedAt: new Date(),
              suspensionReason: parsed.data.reason,
              sessionVersion: { increment: 1 },
            }
          : {
              status: UserStatus.ACTIVE,
              suspendedAt: null,
              suspensionReason: null,
              sessionVersion: { increment: 1 },
            },
      select: { id: true, status: true, suspendedAt: true, suspensionReason: true },
    });
    await recordAdminAction(tx, {
      actorId: admin.admin.id,
      action: parsed.data.status === "SUSPENDED" ? "user.suspended" : "user.restored",
      targetType: "User",
      targetId: id,
      reason: parsed.data.reason,
      metadata: { previousStatus: user.status, nextStatus: result.status },
    });
    return result;
  });

  await publishUserEvents([...affectedUsers], { type: "swap" });
  return actionResponse(updated, {
    message:
      updated.status === UserStatus.SUSPENDED
        ? "Аккаунт приостановлен, активные предложения отменены."
        : "Доступ к аккаунту восстановлен. Объявления остаются в архиве до проверки.",
  });
}
