import { ReportStatus } from "@prisma/client";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
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

  const existing = await prisma.report.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return errorResponse("Жалоба не найдена", 404);

  const resolved =
    parsed.data.status === ReportStatus.RESOLVED ||
    parsed.data.status === ReportStatus.DISMISSED;
  const report = await prisma.report.update({
    where: { id },
    data: {
      status: parsed.data.status,
      resolutionNote: parsed.data.resolutionNote || null,
      resolvedById: resolved ? admin.admin.id : null,
      resolvedAt: resolved ? new Date() : null,
    },
    select: { id: true, status: true, resolvedAt: true },
  });

  return actionResponse(report, { message: "Статус жалобы обновлён." });
}
