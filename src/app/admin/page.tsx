import Link from "next/link";
import {
  ItemStatus,
  ReportReason,
  ReportStatus,
  SwapStatus,
  UserStatus,
} from "@prisma/client";
import { Activity, Archive, BarChart3, CheckCircle2, Flag, Shield, Tag, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { EmptyState } from "@/components/menarium/empty-state";
import { GlassCard } from "@/components/menarium/card";
import { MenariumLinkButton } from "@/components/menarium/button";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/server/admin";
import { ItemModerationActions } from "./item-moderation-actions";
import { ReportModerationActions } from "./report-moderation-actions";
import { UserModerationActions } from "./user-moderation-actions";

export const dynamic = "force-dynamic";

const reportReasonLabels: Record<ReportReason, string> = {
  FRAUD: "Подозрение на мошенничество",
  SPAM: "Спам или навязчивая реклама",
  HARASSMENT: "Оскорбления или преследование",
  PROHIBITED_CONTENT: "Запрещённый контент",
  OTHER: "Другая причина",
};

const reportStatusLabels: Record<ReportStatus, string> = {
  OPEN: "Новая",
  REVIEWING: "На проверке",
  RESOLVED: "Подтверждена",
  DISMISSED: "Отклонена",
};

const userStatusLabels: Record<UserStatus, string> = {
  ACTIVE: "Активен",
  SUSPENDED: "Приостановлен",
  DELETED: "Удалён",
};

export default async function AdminPage() {
  const admin = await getCurrentAdmin();

  const [
    usersCount,
    activeItemsCount,
    archivedItemsCount,
    activeSwapsCount,
    completedSwapsCount,
    reportsCount,
    reports,
    recentItems,
    recentUsers,
  ] = admin
    ? await Promise.all([
        prisma.user.count(),
        prisma.item.count({ where: { status: ItemStatus.ACTIVE } }),
        prisma.item.count({ where: { status: ItemStatus.ARCHIVED } }),
        prisma.swapRequest.count({ where: { status: { in: [SwapStatus.PENDING, SwapStatus.ACCEPTED] } } }),
        prisma.swapRequest.count({ where: { status: SwapStatus.COMPLETED } }),
        prisma.report.count({
          where: { status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] } },
        }),
        prisma.report.findMany({
          where: { status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] } },
          select: {
            id: true,
            targetType: true,
            reason: true,
            details: true,
            status: true,
            resolutionNote: true,
            createdAt: true,
            reporter: { select: { id: true, name: true, email: true } },
            targetUser: { select: { id: true, name: true, email: true, status: true } },
            item: {
              select: {
                id: true,
                title: true,
                status: true,
                owner: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
          take: 50,
        }),
        prisma.item.findMany({
          include: { owner: { select: { name: true, email: true } }, images: true },
          orderBy: { updatedAt: "desc" },
          take: 30,
        }),
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            city: true,
            status: true,
            suspendedAt: true,
            suspensionReason: true,
            createdAt: true,
            _count: { select: { items: true, sentSwaps: true, receivedSwaps: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      ])
    : [0, 0, 0, 0, 0, 0, [], [], []];

  const stats = [
    { label: "Пользователи", value: usersCount, icon: Users, color: "text-teal-400" },
    { label: "Жалобы в очереди", value: reportsCount, icon: Flag, color: "text-red-400" },
    { label: "Активные объявления", value: activeItemsCount, icon: Tag, color: "text-purple-400" },
    { label: "Архив", value: archivedItemsCount, icon: Archive, color: "text-yellow-400" },
    { label: "Активные обмены", value: activeSwapsCount, icon: Activity, color: "text-blue-400" },
    { label: "Завершенные", value: completedSwapsCount, icon: CheckCircle2, color: "text-green-400" },
  ];

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/70 to-purple-500/70">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Админ-панель</h1>
                <p className="mt-1 text-white/55">Базовый production-контур модерации Menarium.</p>
              </div>
            </div>
            {admin ? (
              <MenariumLinkButton href="/admin/analytics" variant="secondary" size="sm">
                <BarChart3 className="h-4 w-4" />
                Пульс продукта
              </MenariumLinkButton>
            ) : null}
          </div>

          {!admin ? (
            <EmptyState
              title="Доступ только для администратора"
              description="Администраторы задаются через ADMIN_EMAILS в production environment."
              actionHref="/profile"
              actionLabel="Вернуться в профиль"
            />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <GlassCard key={stat.label} className="p-5">
                      <Icon className={`mb-3 h-5 w-5 ${stat.color}`} />
                      <div className="text-3xl font-semibold">{stat.value}</div>
                      <p className="mt-1 text-xs text-white/40">{stat.label}</p>
                    </GlassCard>
                  );
                })}
              </div>

              <GlassCard className="overflow-hidden">
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">Очередь жалоб</h2>
                      <p className="mt-1 text-sm text-white/45">
                        Новые обращения и жалобы, которые уже находятся на проверке.
                      </p>
                    </div>
                    <Badge variant={reportsCount > 0 ? "danger" : "teal"}>
                      {reportsCount > 0 ? `${reportsCount} требуют внимания` : "Очередь пуста"}
                    </Badge>
                  </div>
                </div>
                {reports.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-teal-300" />
                    <p className="mt-3 font-medium">Все жалобы обработаны</p>
                    <p className="mt-1 text-sm text-white/45">Новые обращения появятся здесь.</p>
                  </div>
                ) : (
                  reports.map((report) => {
                    const target =
                      report.targetType === "USER"
                        ? report.targetUser
                          ? {
                              href: `/user/${report.targetUser.id}`,
                              label: report.targetUser.name ?? report.targetUser.email,
                              meta: `Пользователь · ${userStatusLabels[report.targetUser.status]}`,
                            }
                          : null
                        : report.item
                          ? {
                              href: `/item/${report.item.id}`,
                              label: report.item.title,
                              meta: `Объявление · ${report.item.owner.name ?? report.item.owner.email}`,
                            }
                          : null;

                    return (
                      <article
                        key={report.id}
                        className="border-b border-white/[0.04] px-5 py-5 last:border-b-0"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                          <div className="min-w-0 flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={report.status === "OPEN" ? "danger" : "gold"}>
                                {reportStatusLabels[report.status]}
                              </Badge>
                              <Badge variant="purple">{reportReasonLabels[report.reason]}</Badge>
                              <time className="text-xs text-white/35" dateTime={report.createdAt.toISOString()}>
                                {new Intl.DateTimeFormat("ru-RU", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(report.createdAt)}
                              </time>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-white/35">
                                  Объект жалобы
                                </p>
                                {target ? (
                                  <>
                                    <Link
                                      href={target.href}
                                      className="mt-2 block font-medium transition-colors hover:text-teal-300"
                                    >
                                      {target.label}
                                    </Link>
                                    <p className="mt-1 text-sm text-white/45">{target.meta}</p>
                                  </>
                                ) : (
                                  <p className="mt-2 text-sm text-white/45">Объект больше недоступен</p>
                                )}
                              </div>
                              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-white/35">
                                  Репортёр
                                </p>
                                <Link
                                  href={`/user/${report.reporter.id}`}
                                  className="mt-2 block font-medium transition-colors hover:text-teal-300"
                                >
                                  {report.reporter.name ?? "Без имени"}
                                </Link>
                                <p className="mt-1 break-all text-sm text-white/45">{report.reporter.email}</p>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-white/35">
                                Детали
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                                {report.details || "Пользователь не добавил подробностей."}
                              </p>
                            </div>
                            {report.resolutionNote ? (
                              <div className="rounded-2xl border border-teal-500/15 bg-teal-500/[0.06] p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-teal-200/60">
                                  Комментарий модератора
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
                                  {report.resolutionNote}
                                </p>
                              </div>
                            ) : null}
                          </div>
                          <div className="xl:w-[330px] xl:shrink-0">
                            <ReportModerationActions
                              reportId={report.id}
                              status={report.status}
                              initialResolutionNote={report.resolutionNote}
                            />
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </GlassCard>

              <GlassCard className="overflow-hidden">
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <h2 className="text-xl font-semibold">Последние объявления</h2>
                  <p className="mt-1 text-sm text-white/45">Быстрая модерация: архивировать или вернуть объявление.</p>
                </div>
                {recentItems.map((item) => (
                  <div key={item.id} className="flex flex-col gap-4 border-b border-white/[0.04] px-5 py-4 last:border-b-0 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Link href={`/item/${item.id}`} className="font-medium transition-colors hover:text-teal-300">
                          {item.title}
                        </Link>
                        <Badge variant={item.status === "ACTIVE" ? "teal" : item.status === "ARCHIVED" ? "glass" : "purple"}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-white/45">
                        {item.category} · {item.city} · {item.owner.name ?? item.owner.email}
                      </p>
                    </div>
                    <ItemModerationActions itemId={item.id} status={item.status} />
                  </div>
                ))}
              </GlassCard>

              <GlassCard className="overflow-hidden">
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <h2 className="text-xl font-semibold">Пользователи</h2>
                  <p className="mt-1 text-sm text-white/45">
                    Последние регистрации, состояние аккаунта и действия модерации.
                  </p>
                </div>
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex flex-col gap-4 border-b border-white/[0.04] px-5 py-4 last:border-b-0 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Link href={`/user/${user.id}`} className="font-medium transition-colors hover:text-teal-300">
                          {user.name ?? "Без имени"}
                        </Link>
                        <Badge
                          variant={
                            user.status === "ACTIVE"
                              ? "teal"
                              : user.status === "SUSPENDED"
                                ? "danger"
                                : "glass"
                          }
                        >
                          {userStatusLabels[user.status]}
                        </Badge>
                        <Badge variant={user.emailVerified ? "teal" : "glass"}>
                          {user.emailVerified ? "Email подтверждён" : "Email не подтверждён"}
                        </Badge>
                      </div>
                      <p className="text-sm text-white/45">
                        {user.email}
                        {user.city ? ` · ${user.city}` : ""}
                        {" · "}
                        {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(user.createdAt)}
                      </p>
                      {user.status === "SUSPENDED" ? (
                        <p className="mt-2 text-sm text-red-200/80">
                          {user.suspensionReason ?? "Причина не указана"}
                          {user.suspendedAt
                            ? ` · ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(user.suspendedAt)}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-white/50">
                      <span className="rounded-xl bg-white/5 px-3 py-1.5">{user._count.items} объявл.</span>
                      <span className="rounded-xl bg-white/5 px-3 py-1.5">
                        {user._count.sentSwaps + user._count.receivedSwaps} обменов
                      </span>
                    </div>
                    <UserModerationActions
                      userId={user.id}
                      status={user.status}
                      isCurrentAdmin={user.id === admin.id}
                    />
                  </div>
                ))}
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
