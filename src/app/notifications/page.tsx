import { Bell, MessageCircle, Repeat, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { loginHref } from "@/lib/utils";
import { MarkAllNotificationsRead, MarkNotificationRead } from "./notification-actions";
import { NotificationLink } from "./notification-link";

export const dynamic = "force-dynamic";

const typeIcons = {
  SWAP_RECEIVED: Repeat,
  SWAP_ACCEPTED: Repeat,
  SWAP_DECLINED: Repeat,
  SWAP_CANCELLED: Repeat,
  SWAP_COMPLETED: Repeat,
  DEAL_MESSAGE_RECEIVED: MessageCircle,
  ITEM_MESSAGE_RECEIVED: MessageCircle,
} as const;

export default async function NotificationsPage() {
  const userId = await getCurrentUserId();
  const [notifications, unreadCount] = userId
    ? await Promise.all([
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 80,
        }),
        prisma.notification.count({ where: { userId, isRead: false } }),
      ])
    : [[], 0];

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold md:text-5xl">
                Центр <span className="gradient-text">уведомлений</span>
              </h1>
              <p className="mt-3 text-white/60">События по обменам, сообщениям и статусам сделок.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={unreadCount > 0 ? "purple" : "glass"}>Новых {unreadCount}</Badge>
              {userId ? <MarkAllNotificationsRead disabled={unreadCount === 0} /> : null}
            </div>
          </div>

          {!userId ? (
            <EmptyState
              title="Войдите, чтобы видеть уведомления"
              description="Menarium будет показывать здесь новые обмены, сообщения и изменения статусов."
              actionHref={loginHref("/notifications")}
              actionLabel="Войти"
            />
          ) : notifications.length > 0 ? (
            <GlassCard className="overflow-hidden">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] ?? Bell;
                const content = (
                  <div className="flex items-start gap-4 border-b border-white/[0.04] px-5 py-4 transition-colors hover:bg-white/[0.04] last:border-b-0">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${notification.isRead ? "bg-white/5 text-white/45" : "bg-gradient-to-br from-teal-500/60 to-purple-500/60 text-white"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h2 className="font-medium">{notification.title}</h2>
                        {!notification.isRead ? <Badge variant="teal">Новое</Badge> : null}
                      </div>
                      <p className="text-sm text-white/55">{notification.message}</p>
                      <p className="mt-2 text-xs text-white/30">
                        {notification.createdAt.toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!notification.isRead ? <MarkNotificationRead id={notification.id} /> : null}
                  </div>
                );

                return notification.href ? (
                  <NotificationLink key={notification.id} id={notification.id} href={notification.href} isRead={notification.isRead}>
                    {content}
                  </NotificationLink>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </GlassCard>
          ) : (
            <EmptyState
              icon={<Sparkles className="h-12 w-12" />}
              title="Уведомлений пока нет"
              description="Когда появятся предложения обмена, сообщения или изменения статусов, они будут здесь."
              actionHref="/catalog"
              actionLabel="Открыть каталог"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
