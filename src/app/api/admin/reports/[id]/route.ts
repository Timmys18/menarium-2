import { NotificationType, ReportStatus } from "@prisma/client";
import { z } from "zod";
import { createNotification } from "@/features/notifications/create-notification";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publishUserEvents } from "@/lib/realtime";
import { requireAdmin } from "@/server/admin";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.nativeEnum(ReportStatus),
  resolutionNote: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function PATCH(req: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin.ok) return errorResponse("Доступ запрещён", 403);

  const { id } = await context.params;
  const parsed = schema.safeParse(await parseJson(req));
  if (!parsed.success) return errorResponse("Проверьте статус жалобы", 400);

  const existing = await prisma.report.findUnique({
    where: { id },
    select: { id: true, reporterId: true, status: true },
  });
  if (!existing) return errorResponse("Жалоба не найдена", 404);

  const resolved =
    parsed.data.status === ReportStatus.RESOLVED ||
    parsed.data.status === ReportStatus.DISMISSED;
  let shouldNotify = false;

  const report = await prisma.$transaction(async (tx) => {
    if (resolved) {
      const transition = await tx.report.updateMany({
        where: {
          id,
          status: { notIn: [ReportStatus.RESOLVED, ReportStatus.DISMISSED] },
        },
        data: {
          status: parsed.data.status,
          resolutionNote: parsed.data.resolutionNote || null,
          resolvedById: admin.admin.id,
          resolvedAt: new Date(),
        },
      });
      shouldNotify = transition.count === 1;

      if (!shouldNotify) {
        await tx.report.update({
          where: { id },
          data: {
            status: parsed.data.status,
            resolutionNote: parsed.data.resolutionNote || null,
            resolvedById: admin.admin.id,
          },
        });
      }
    } else {
      await tx.report.update({
        where: { id },
        data: {
          status: parsed.data.status,
          resolutionNote: parsed.data.resolutionNote || null,
          resolvedById: null,
          resolvedAt: null,
        },
      });
    }

    if (shouldNotify) {
      await createNotification(tx, {
        userId: existing.reporterId,
        type: NotificationType.REPORT_UPDATED,
        title: "Проверка обращения завершена",
        message:
          parsed.data.status === ReportStatus.RESOLVED
            ? "Нарушение подтверждено. Мы приняли необходимые меры."
            : "Проверка завершена. По доступным данным нарушение не подтвердилось.",
        href: "/profile/safety",
        entityType: "Report",
        entityId: id,
      });
    }

    return tx.report.findUniqueOrThrow({
      where: { id },
      select: { id: true, status: true, resolvedAt: true },
    });
  });

  if (shouldNotify) {
    await publishUserEvents([existing.reporterId], {
      type: "notification",
      entityId: id,
    });
  }

  return actionResponse(report, { message: "Статус жалобы обновлён." });
}
