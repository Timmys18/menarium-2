import type { NotificationType, PrismaClient } from "@prisma/client";

export async function createNotification(
  db: Pick<PrismaClient, "notification">,
  data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    href?: string;
    entityType?: string;
    entityId?: string;
    coalesceUnread?: boolean;
  },
) {
  if (data.coalesceUnread && data.entityId) {
    const existing = await db.notification.findFirst({
      where: {
        userId: data.userId,
        type: data.type,
        entityId: data.entityId,
        isRead: false,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) {
      return db.notification.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          message: data.message,
          href: data.href,
          createdAt: new Date(),
        },
      });
    }
  }

  return db.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      href: data.href,
      entityType: data.entityType,
      entityId: data.entityId,
    },
  });
}
