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
  },
) {
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
