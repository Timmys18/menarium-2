import { NextRequest } from "next/server";
import { z } from "zod";
import { actionResponse, errorResponse, getPaging, listResponse, parseJson } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { publishUserEvent } from "@/lib/realtime";

function serializeNotification(notification: {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: Date;
}) {
  return {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { limit, offset } = getPaging(req);
  const where = { userId: auth.userId };
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: auth.userId, isRead: false } }),
  ]);

  return listResponse(notifications.map(serializeNotification), { limit, offset }, total, {
    unreadCount,
  });
}

const patchSchema = z.object({
  id: z.string().optional(),
  readAll: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "notifications:update");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Некорректный запрос", 400);

  if (parsed.data.readAll) {
    await prisma.notification.updateMany({
      where: { userId: auth.userId, isRead: false },
      data: { isRead: true },
    });
    await publishUserEvent(auth.userId, { type: "counts" });
    return actionResponse({ readAll: true });
  }

  if (!parsed.data.id) return errorResponse("Укажите id уведомления или readAll", 400);

  const notification = await prisma.notification.findFirst({
    where: { id: parsed.data.id, userId: auth.userId },
  });
  if (!notification) return errorResponse("Уведомление не найдено", 404);

  await prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true },
  });

  await publishUserEvent(auth.userId, { type: "counts" });
  return actionResponse({ id: notification.id, isRead: true });
}
