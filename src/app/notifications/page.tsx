import Link from "next/link";
import { Bell, CalendarClock, MessageCircle, Repeat, ShieldCheck, Sparkles, Star } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { SurfaceCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { getSafeNotificationHref } from "@/features/notifications/href";
import { prisma } from "@/lib/prisma";
import { cn, loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { MarkAllNotificationsRead, MarkNotificationRead } from "./notification-actions";
import { NotificationLink } from "./notification-link";

export const dynamic = "force-dynamic";

type NotificationFilter = "unread" | "all";
type Props = {
  searchParams: Promise<{ filter?: string | string[]; page?: string | string[] }>;
};

const PAGE_SIZE = 30;
const typeIcons = {
  SWAP_RECEIVED: Repeat,
  SWAP_ACCEPTED: Repeat,
  SWAP_DECLINED: Repeat,
  SWAP_CANCELLED: Repeat,
  SWAP_COMPLETED: Repeat,
  DEAL_MESSAGE_RECEIVED: MessageCircle,
  ITEM_MESSAGE_RECEIVED: MessageCircle,
  REVIEW_PUBLISHED: Star,
  HANDOFF_UPDATED: CalendarClock,
  REPORT_UPDATED: ShieldCheck,
} as const;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function notificationsHref(filter: NotificationFilter, page?: number) {
  const search = new URLSearchParams({ filter });
  if (page && page > 1) search.set("page", String(page));
  return `/notifications?${search.toString()}`;
}

function dayLabel(value: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (value >= today) return "Сегодня";
  if (value >= yesterday) return "Вчера";
  return "Ранее";
}

export default async function NotificationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const userId = await getCurrentUserId();
  const [totalCount, unreadCount] = userId
    ? await Promise.all([
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({ where: { userId, isRead: false } }),
      ])
    : [0, 0];
  const requestedFilter = firstParam(params.filter);
  const activeFilter: NotificationFilter =
    requestedFilter === "all" || requestedFilter === "unread"
      ? requestedFilter
      : unreadCount > 0
        ? "unread"
        : "all";
  const filteredTotal = activeFilter === "unread" ? unreadCount : totalCount;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const requestedPage = Math.max(1, Math.floor(Number(firstParam(params.page)) || 1));
  const page = Math.min(requestedPage, totalPages);
  const notifications = userId
    ? await prisma.notification.findMany({
        where: { userId, ...(activeFilter === "unread" ? { isRead: false } : {}) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
    : [];
  const groups = ["Сегодня", "Вчера", "Ранее"]
    .map((label) => ({
      label,
      notifications: notifications.filter((notification) => dayLabel(notification.createdAt) === label),
    }))
    .filter((group) => group.notifications.length > 0);

  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/60">
                Все события
              </p>
              <h1 className="type-page-title text-4xl md:text-5xl">Уведомления</h1>
            </div>
            {userId && unreadCount > 0 ? <MarkAllNotificationsRead disabled={false} /> : null}
          </header>

          {!userId ? (
            <EmptyState
              title="Войдите, чтобы видеть уведомления"
              description="Menarium будет показывать здесь новые обмены, сообщения и изменения статусов."
              actionHref={loginHref("/notifications")}
              actionLabel="Войти"
            />
          ) : (
            <>
              <nav aria-label="Фильтр уведомлений" className="mb-5 flex gap-2 rounded-[20px] border border-white/8 bg-white/[0.025] p-2">
                {([
                  ["unread", "Новые", unreadCount],
                  ["all", "Все", totalCount],
                ] as const).map(([filter, label, count]) => (
                  <Link
                    key={filter}
                    href={notificationsHref(filter)}
                    aria-current={activeFilter === filter ? "page" : undefined}
                    className={cn(
                      "rounded-[14px] px-4 py-2.5 text-sm font-medium transition",
                      activeFilter === filter
                        ? "bg-gradient-to-r from-blue-500 to-teal-400 text-white"
                        : "text-white/45 hover:bg-white/[0.055] hover:text-white",
                    )}
                  >
                    {label}
                    <span className={cn("ml-2 text-xs", activeFilter === filter ? "text-white/75" : "text-white/28")}>
                      {count}
                    </span>
                  </Link>
                ))}
              </nav>

              {groups.length > 0 ? (
                <div className="space-y-5">
                  {groups.map((group) => (
                    <section key={group.label} aria-labelledby={`notifications-${group.label}`}>
                      <h2
                        id={`notifications-${group.label}`}
                        className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/48"
                      >
                        {group.label}
                      </h2>
                      <SurfaceCard className="overflow-hidden">
                        {group.notifications.map((notification) => {
                          const Icon = typeIcons[notification.type] ?? Bell;
                          const safeHref = getSafeNotificationHref(notification.href);
                          const content = (
                            <>
                              <span
                                className={cn(
                                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]",
                                  notification.isRead
                                    ? "bg-white/[0.045] text-white/35"
                                    : "bg-gradient-to-br from-blue-500/55 to-teal-400/45 text-white",
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-white">{notification.title}</h3>
                                  {!notification.isRead ? <Badge variant="teal">Новое</Badge> : null}
                                </div>
                                <p className="mt-1 text-sm leading-5 text-white/60">{notification.message}</p>
                                <time
                                  dateTime={notification.createdAt.toISOString()}
                                  className="mt-2 block text-xs text-white/42"
                                >
                                  {notification.createdAt.toLocaleString("ru-RU", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </time>
                              </div>
                            </>
                          );

                          return (
                            <div
                              key={notification.id}
                              className={cn(
                                "flex items-start gap-2 border-b border-white/[0.05] p-2 last:border-b-0",
                                !notification.isRead && "bg-blue-400/[0.025]",
                              )}
                            >
                              {safeHref ? (
                                <NotificationLink
                                  id={notification.id}
                                  href={safeHref}
                                  isRead={notification.isRead}
                                  className="flex min-w-0 flex-1 items-start gap-3 rounded-[16px] px-3 py-3 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60"
                                >
                                  {content}
                                </NotificationLink>
                              ) : (
                                <div className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3">{content}</div>
                              )}
                              {!notification.isRead ? (
                                <div className="shrink-0 pt-2">
                                  <MarkNotificationRead id={notification.id} />
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </SurfaceCard>
                    </section>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Sparkles className="h-12 w-12" />}
                  title={activeFilter === "unread" ? "Новых уведомлений нет" : "Уведомлений пока нет"}
                  description={
                    activeFilter === "unread"
                      ? "Всё прочитано. Можно посмотреть предыдущие события."
                      : "Когда появятся предложения, сообщения или изменения статусов, они будут здесь."
                  }
                  actionHref={activeFilter === "unread" ? notificationsHref("all") : "/catalog"}
                  actionLabel={activeFilter === "unread" ? "Открыть все" : "Открыть каталог"}
                />
              )}

              {totalPages > 1 ? (
                <nav aria-label="Страницы уведомлений" className="mt-8 flex items-center justify-center gap-3">
                  {page > 1 ? (
                    <Link
                      href={notificationsHref(activeFilter, page - 1)}
                      className="rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      ← Назад
                    </Link>
                  ) : null}
                  <span className="text-xs text-white/35">{page} из {totalPages}</span>
                  {page < totalPages ? (
                    <Link
                      href={notificationsHref(activeFilter, page + 1)}
                      className="rounded-[14px] bg-gradient-to-r from-blue-500 to-teal-400 px-4 py-2.5 text-sm font-medium text-white"
                    >
                      Дальше →
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
