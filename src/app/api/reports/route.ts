import { ReportReason, ReportStatus, ReportTargetType, UserStatus } from "@prisma/client";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { requireUserId } from "@/server/session";

const reportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType),
  targetId: z.string().min(1),
  reason: z.nativeEnum(ReportReason),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "reports:create");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const parsed = reportSchema.safeParse(await parseJson(req));
  if (!parsed.success) return errorResponse("Проверьте данные жалобы", 400);

  const { targetType, targetId, reason, details } = parsed.data;
  let targetUserId: string | null = null;
  let itemId: string | null = null;

  if (targetType === ReportTargetType.USER) {
    if (targetId === auth.userId) return errorResponse("Нельзя пожаловаться на себя", 400);
    const target = await prisma.user.findFirst({
      where: { id: targetId, status: { not: UserStatus.DELETED } },
      select: { id: true },
    });
    if (!target) return errorResponse("Пользователь не найден", 404);
    targetUserId = target.id;
  } else {
    const item = await prisma.item.findUnique({
      where: { id: targetId },
      select: { id: true, ownerId: true },
    });
    if (!item) return errorResponse("Объявление не найдено", 404);
    if (item.ownerId === auth.userId) return errorResponse("Нельзя пожаловаться на своё объявление", 400);
    itemId = item.id;
    targetUserId = item.ownerId;
  }

  const duplicate = await prisma.report.findFirst({
    where: {
      reporterId: auth.userId,
      targetType,
      targetUserId,
      itemId,
      status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] },
    },
    select: { id: true },
  });
  if (duplicate) {
    return actionResponse(
      { id: duplicate.id, duplicate: true },
      { message: "Жалоба уже передана модератору." },
    );
  }

  const report = await prisma.report.create({
    data: {
      reporterId: auth.userId,
      targetType,
      targetUserId,
      itemId,
      reason,
      details: details || null,
    },
    select: { id: true, status: true, createdAt: true },
  });

  return actionResponse(
    { ...report, createdAt: report.createdAt.toISOString() },
    { message: "Спасибо. Модератор проверит жалобу." },
    201,
  );
}
