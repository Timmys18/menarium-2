import { ItemStatus } from "@prisma/client";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/admin";
import { recordAdminAction } from "@/server/admin-audit";

type Context = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum([ItemStatus.ACTIVE, ItemStatus.ARCHIVED]),
});

export async function PATCH(req: Request, context: Context) {
  const auth = await requireAdmin();
  if (!auth.ok) return errorResponse("Доступ только для администратора", 403);

  const { id } = await context.params;
  const body = await parseJson(req);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Некорректный статус объявления", 400);

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return errorResponse("Объявление не найдено", 404);

  if (item.status === ItemStatus.IN_DEAL) {
    return errorResponse("Нельзя модерировать объявление, пока оно находится в активной сделке", 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.item.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    });
    await recordAdminAction(tx, {
      actorId: auth.admin.id,
      action: parsed.data.status === ItemStatus.ARCHIVED ? "item.archived" : "item.restored",
      targetType: "Item",
      targetId: id,
      metadata: { previousStatus: item.status, nextStatus: result.status },
    });
    return result;
  });

  return actionResponse(updated);
}
