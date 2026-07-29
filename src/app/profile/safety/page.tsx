import Link from "next/link";
import { Prisma, ReportReason, ReportStatus } from "@prisma/client";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  MessageCircleWarning,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { prisma } from "@/lib/prisma";
import { cn, loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";

export const dynamic = "force-dynamic";

type SafetyFilter = "all" | "active" | "closed";
type Props = {
  searchParams: Promise<{ filter?: string | string[] }>;
};

const ACTIVE_STATUSES: ReportStatus[] = [ReportStatus.OPEN, ReportStatus.REVIEWING];
const CLOSED_STATUSES: ReportStatus[] = [ReportStatus.RESOLVED, ReportStatus.DISMISSED];

const reasonLabels: Record<ReportReason, string> = {
  FRAUD: "Несоответствие или мошенничество",
  SPAM: "Спам или реклама",
  HARASSMENT: "Небезопасное поведение",
  PROHIBITED_CONTENT: "Запрещённый контент",
  OTHER: "Другая проблема",
};

const statusPresentation = {
  OPEN: {
    label: "Получено",
    description: "Обращение сохранено и ждёт проверки модератором.",
    variant: "gold",
    icon: Clock3,
  },
  REVIEWING: {
    label: "На проверке",
    description: "Модератор изучает контекст и детали обращения.",
    variant: "purple",
    icon: MessageCircleWarning,
  },
  RESOLVED: {
    label: "Меры приняты",
    description: "Проверка подтвердила нарушение. Мы приняли необходимые меры.",
    variant: "teal",
    icon: CheckCircle2,
  },
  DISMISSED: {
    label: "Проверка завершена",
    description: "По доступным данным нарушение не подтвердилось.",
    variant: "glass",
    icon: CheckCircle2,
  },
} as const;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safetyHref(filter: SafetyFilter) {
  return `/profile/safety?filter=${filter}`;
}

export default async function SafetyCenterPage({ searchParams }: Props) {
  const params = await searchParams;
  const userId = await getCurrentUserId();
  const requestedFilter = firstParam(params.filter);
  const activeFilter: SafetyFilter =
    requestedFilter === "active" || requestedFilter === "closed"
      ? requestedFilter
      : "all";
  const statusWhere =
    activeFilter === "active"
      ? { in: ACTIVE_STATUSES }
      : activeFilter === "closed"
        ? { in: CLOSED_STATUSES }
        : undefined;
  const reportWhere: Prisma.ReportWhereInput = userId
    ? { reporterId: userId, ...(statusWhere ? { status: statusWhere } : {}) }
    : { id: { in: [] } };

  const [totalCount, activeCount, closedCount, reports] = userId
    ? await Promise.all([
        prisma.report.count({ where: { reporterId: userId } }),
        prisma.report.count({
          where: { reporterId: userId, status: { in: ACTIVE_STATUSES } },
        }),
        prisma.report.count({
          where: { reporterId: userId, status: { in: CLOSED_STATUSES } },
        }),
        prisma.report.findMany({
          where: reportWhere,
          select: {
            id: true,
            targetType: true,
            reason: true,
            details: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            resolvedAt: true,
            targetUser: { select: { id: true, name: true } },
            item: { select: { id: true, title: true } },
            swap: {
              select: {
                id: true,
                senderId: true,
                receiverId: true,
                sender: { select: { name: true } },
                receiver: { select: { name: true } },
                senderItem: { select: { title: true } },
                receiverItem: { select: { title: true } },
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 100,
        }),
      ])
    : [0, 0, 0, []];

  return (
    <AppShell>
      <div className="page-enter min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7">
            <div className="flex items-center gap-3 text-teal-200/70">
              <ShieldCheck className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                Доверие и защита
              </p>
            </div>
            <h1 className="type-page-title mt-3 text-4xl md:text-5xl">Центр безопасности</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
              Здесь сохраняются ваши обращения, их связь со сделкой и результат проверки.
              Внутреннее расследование остаётся конфиденциальным.
            </p>
          </header>

          {!userId ? (
            <EmptyState
              icon={<ShieldCheck className="h-12 w-12" />}
              title="Войдите, чтобы открыть Центр безопасности"
              description="После входа здесь будут храниться обращения и результаты их проверки."
              actionHref={loginHref("/profile/safety")}
              actionLabel="Войти"
            />
          ) : (
            <div className="space-y-5">
              <GlassCard className="overflow-hidden border border-teal-300/12 bg-gradient-to-br from-teal-300/[0.07] via-white/[0.025] to-blue-400/[0.06] p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-teal-300/12 text-teal-200">
                      <ShieldCheck className="h-6 w-6" />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold">Мы сохраняем контекст</h2>
                      <p className="mt-1 max-w-xl text-sm leading-5 text-white/48">
                        Жалоба из обмена прикрепляется к конкретной сделке. Блокировка остановит
                        новые контакты, но чат принятого обмена останется доступен для безопасного завершения.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/exchange"
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.055] px-4 text-sm font-semibold text-white/72 transition hover:bg-white/[0.09] hover:text-white"
                  >
                    Открыть обмены
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </GlassCard>

              <nav
                aria-label="Фильтр обращений"
                className="grid grid-cols-3 gap-2 rounded-[20px] border border-white/8 bg-white/[0.025] p-2"
              >
                {([
                  ["all", "Все", totalCount],
                  ["active", "В работе", activeCount],
                  ["closed", "Завершены", closedCount],
                ] as const).map(([filter, label, count]) => (
                  <Link
                    key={filter}
                    href={safetyHref(filter)}
                    aria-current={activeFilter === filter ? "page" : undefined}
                    className={cn(
                      "rounded-[14px] px-3 py-2.5 text-center text-sm font-medium transition",
                      activeFilter === filter
                        ? "bg-gradient-to-r from-blue-500 to-teal-400 text-white"
                        : "text-white/48 hover:bg-white/[0.055] hover:text-white",
                    )}
                  >
                    {label}
                    <span
                      className={cn(
                        "ml-2 text-xs",
                        activeFilter === filter ? "text-white/75" : "text-white/30",
                      )}
                    >
                      {count}
                    </span>
                  </Link>
                ))}
              </nav>

              {reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map((report) => {
                    const presentation = statusPresentation[report.status];
                    const StatusIcon = presentation.icon;
                    const partner =
                      report.swap && report.swap.senderId === userId
                        ? report.swap.receiver
                        : report.swap?.sender;
                    const contextTitle = report.swap
                      ? `${report.swap.senderItem.title} ↔ ${report.swap.receiverItem.title}`
                      : report.item?.title ??
                        report.targetUser?.name ??
                        "Объект больше недоступен";
                    const contextHref = report.swap
                      ? `/exchange?swap=${report.swap.id}`
                      : report.item
                        ? `/item/${report.item.id}`
                        : report.targetUser
                          ? `/user/${report.targetUser.id}`
                          : null;

                    return (
                      <GlassCard key={report.id} className="border border-white/8 p-5 sm:p-6">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                          <span
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]",
                              report.status === ReportStatus.RESOLVED
                                ? "bg-teal-300/12 text-teal-200"
                                : report.status === ReportStatus.REVIEWING
                                  ? "bg-blue-400/12 text-blue-200"
                                  : "bg-white/[0.055] text-white/55",
                            )}
                          >
                            <StatusIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={presentation.variant}>{presentation.label}</Badge>
                              <Badge variant="glass">{reasonLabels[report.reason]}</Badge>
                              <time
                                dateTime={report.createdAt.toISOString()}
                                className="text-xs text-white/30"
                              >
                                {report.createdAt.toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </time>
                            </div>
                            <p className="mt-3 text-sm leading-5 text-white/65">
                              {presentation.description}
                            </p>
                            <div className="mt-4 rounded-[16px] border border-white/7 bg-white/[0.025] p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">
                                {report.swap ? "Связанный обмен" : "Объект обращения"}
                              </p>
                              <p className="mt-1.5 line-clamp-2 text-sm font-medium text-white/78">
                                {contextTitle}
                              </p>
                              {partner ? (
                                <p className="mt-1 text-xs text-white/38">
                                  Участник: {partner.name ?? "пользователь Менариум"}
                                </p>
                              ) : null}
                              {contextHref ? (
                                <Link
                                  href={contextHref}
                                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-200 transition hover:text-teal-100"
                                >
                                  Открыть контекст
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              ) : null}
                            </div>
                            {report.details ? (
                              <div className="mt-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">
                                  Ваше описание
                                </p>
                                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-white/48">
                                  {report.details}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Flag className="h-11 w-11" />}
                  title={
                    activeFilter === "all"
                      ? "Обращений пока нет"
                      : activeFilter === "active"
                        ? "Нет обращений в работе"
                        : "Нет завершённых обращений"
                  }
                  description={
                    activeFilter === "all"
                      ? "Если возникнет проблема, сообщите модератору из объявления, профиля пользователя или конкретного обмена."
                      : "Можно открыть все обращения или вернуться к обменам."
                  }
                  actionHref={activeFilter === "all" ? "/exchange" : safetyHref("all")}
                  actionLabel={activeFilter === "all" ? "Открыть обмены" : "Показать все"}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
