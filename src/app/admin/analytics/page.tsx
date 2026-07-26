import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Box,
  CheckCircle2,
  Clock3,
  Eye,
  Handshake,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/menarium/empty-state";
import { GlassCard } from "@/components/menarium/card";
import { getProductAnalyticsDashboard } from "@/features/analytics/dashboard-data";
import { getCurrentAdmin } from "@/server/admin";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("ru-RU");
const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Moscow",
});
const generatedAtFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Moscow",
});

function formatPercent(value: number | null) {
  return value === null ? "Нет данных" : `${value.toLocaleString("ru-RU")}%`;
}

function formatHours(value: number | null) {
  if (value === null) return "Нет данных";
  if (value < 1) return `${Math.max(1, Math.round(value * 60))} мин`;
  if (value < 24) return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} ч`;
  return `${(value / 24).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} дн`;
}

export default async function ProductAnalyticsPage() {
  const admin = await getCurrentAdmin();
  const dashboard = admin ? await getProductAnalyticsDashboard() : null;

  const signals = dashboard
    ? [
        dashboard.traffic.uniqueVisitors >= 20 &&
        dashboard.cohort[0]!.value / dashboard.traffic.uniqueVisitors < 0.03
          ? "Менее 3% посетителей зарегистрировались: проверяем ценностное предложение и первый экран."
          : null,
        dashboard.cohort[0]!.value >= 5 && (dashboard.cohort[2]!.rate ?? 0) < 35
          ? "Менее 35% новых пользователей создали первую вещь: нужен более короткий онбординг предложения."
          : null,
        dashboard.business.swapsProposed >= 5 && (dashboard.business.acceptanceRate ?? 0) < 25
          ? "Менее четверти предложений принимаются: проверяем релевантность подбора и качество карточек."
          : null,
        dashboard.business.proposalsAccepted >= 3 && (dashboard.business.completionRate ?? 0) < 50
          ? "Менее половины принятых предложений завершились: проверяем координацию встречи и доверие."
          : null,
      ].filter((signal): signal is string => Boolean(signal))
    : [];

  const maxDailyActivity = dashboard
    ? Math.max(
        1,
        ...dashboard.trend.flatMap((day) => [
          day.registrations,
          day.items,
          day.proposals,
          day.completions,
        ]),
      )
    : 1;

  return (
    <AppShell>
      <main className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin"
            className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
          >
            <ArrowLeft className="h-4 w-4" />
            К модерации
          </Link>

          <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-300/80">
                <Activity className="h-4 w-4" />
                Product intelligence
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Пульс Menarium</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50 sm:text-base">
                Путь от первого визита до завершённого обмена. Только first-party данные без рекламных трекеров,
                содержимого сообщений и персональных полей.
              </p>
            </div>
            {dashboard ? (
              <div className="rounded-2xl border border-teal-400/15 bg-teal-400/[0.06] px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2 text-sm font-medium text-teal-200">
                  <span className="h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_14px_rgba(94,234,212,0.8)]" />
                  Данные обновлены
                </div>
                <p className="mt-1 text-xs text-white/35">{generatedAtFormatter.format(dashboard.generatedAt)} МСК</p>
              </div>
            ) : null}
          </header>

          {!admin || !dashboard ? (
            <EmptyState
              title="Доступ только для администратора"
              description="Продуктовая аналитика содержит внутренние показатели Menarium."
              actionHref="/profile"
              actionLabel="Вернуться в профиль"
            />
          ) : (
            <div className="space-y-6">
              {process.env.PRODUCT_ANALYTICS_ENABLED !== "true" ? (
                <GlassCard className="border-amber-400/20 bg-amber-400/[0.05] p-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                    <div>
                      <p className="font-medium text-amber-100">Сбор посещений выключен</p>
                      <p className="mt-1 text-sm leading-6 text-white/50">
                        Бизнес-метрики продолжают считаться из основных данных, но для трафика установите
                        PRODUCT_ANALYTICS_ENABLED=true.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ) : null}

              <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
                <GlassCard className="relative overflow-hidden border-teal-400/15 p-6 sm:p-7">
                  <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-teal-400/10 blur-3xl" />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-sm text-teal-200/75">
                      <Target className="h-4 w-4" />
                      North star · 30 дней
                    </div>
                    <div className="mt-5 flex items-end gap-3">
                      <strong className="text-6xl leading-none text-white">
                        {numberFormatter.format(dashboard.business.swapsCompleted)}
                      </strong>
                      <span className="pb-1 text-sm text-white/40">завершённых обменов</span>
                    </div>
                    <p className="mt-5 max-w-md text-sm leading-6 text-white/50">
                      Реальная полученная ценность: обе стороны подтвердили обмен, а вещи перешли в архив.
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
                      <Eye className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-white/30">30 дней</span>
                  </div>
                  <strong className="mt-5 block text-4xl font-semibold">
                    {numberFormatter.format(dashboard.traffic.uniqueVisitors)}
                  </strong>
                  <p className="mt-1 text-sm text-white/45">уникальных посетителей</p>
                  <p className="mt-4 text-xs text-white/30">
                    {numberFormatter.format(dashboard.traffic.pageViews)} просмотров · {numberFormatter.format(dashboard.traffic.sessions)} сессий
                  </p>
                </GlassCard>

                <GlassCard className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                      <Handshake className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-white/30">качество мэтчинга</span>
                  </div>
                  <strong className="mt-5 block text-4xl font-semibold">
                    {formatPercent(dashboard.business.acceptanceRate)}
                  </strong>
                  <p className="mt-1 text-sm text-white/45">предложений приняты</p>
                  <p className="mt-4 text-xs text-white/30">
                    {numberFormatter.format(dashboard.business.proposalsAccepted)} из {numberFormatter.format(dashboard.business.swapsProposed)}
                  </p>
                </GlassCard>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <GlassCard className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Route className="h-5 w-5 text-teal-300" />
                        <h2 className="text-xl font-semibold">Активация новой когорты</h2>
                      </div>
                      <p className="mt-2 text-sm text-white/40">
                        Пользователи, зарегистрированные за последние 30 дней. Процент считается от регистраций.
                      </p>
                    </div>
                    <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-white/45">
                      {numberFormatter.format(dashboard.cohort[0]!.value)} человек
                    </span>
                  </div>

                  <div className="mt-7 space-y-4">
                    {dashboard.cohort.map((step, index) => {
                      const width = step.rate ?? 0;
                      return (
                        <div key={step.key}>
                          <div className="mb-2 flex items-baseline justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-[11px] text-white/45">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium">{step.label}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold">{numberFormatter.format(step.value)}</span>
                              <span className="ml-2 text-xs text-white/35">{formatPercent(step.rate)}</span>
                            </div>
                          </div>
                          <div className="ml-9 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-300"
                              style={{ width: `${Math.min(100, width)}%`, opacity: 1 - index * 0.1 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>

                <GlassCard className="p-5 sm:p-7">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-300" />
                    <h2 className="text-xl font-semibold">Сигналы продукта</h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/40">
                    Стартовые внутренние пороги. После накопления данных заменим их целями по когортам.
                  </p>

                  <div className="mt-6 space-y-3">
                    {signals.length ? (
                      signals.map((signal) => (
                        <div key={signal} className="flex gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                          <p className="text-sm leading-6 text-white/65">{signal}</p>
                        </div>
                      ))
                    ) : (
                      <div className="flex gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <p className="text-sm leading-6 text-white/65">
                          Критических отклонений по стартовым порогам нет. Продолжаем накапливать когорты.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/[0.035] p-4">
                      <p className="text-xs text-white/35">Активация предложения</p>
                      <strong className="mt-2 block text-2xl">{formatPercent(dashboard.cohort[2]!.rate)}</strong>
                    </div>
                    <div className="rounded-2xl bg-white/[0.035] p-4">
                      <p className="text-xs text-white/35">Принято → завершено</p>
                      <strong className="mt-2 block text-2xl">{formatPercent(dashboard.business.completionRate)}</strong>
                    </div>
                  </div>
                </GlassCard>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.5fr_0.5fr]">
                <GlassCard className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-sky-300" />
                        <h2 className="text-xl font-semibold">Ежедневный импульс</h2>
                      </div>
                      <p className="mt-2 text-sm text-white/40">14 дней · московское время</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/45">
                      <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-sky-400" />Регистрации</span>
                      <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-teal-400" />Вещи</span>
                      <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-300" />Предложения</span>
                      <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-300" />Завершения</span>
                    </div>
                  </div>

                  <div className="mt-8 grid h-56 grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1 sm:gap-2" role="img" aria-label="Активность Menarium за 14 дней">
                    {dashboard.trend.map((day) => (
                      <div key={day.day} className="flex h-full min-w-0 flex-col justify-end">
                        <div className="flex h-[184px] items-end justify-center gap-px" title={`${day.day}: ${day.registrations} регистраций, ${day.items} вещей, ${day.proposals} предложений, ${day.completions} завершений`}>
                          <span className="w-1/4 rounded-t-sm bg-sky-400/80" style={{ height: `${Math.max(day.registrations ? 4 : 0, (day.registrations / maxDailyActivity) * 100)}%` }} />
                          <span className="w-1/4 rounded-t-sm bg-teal-400/80" style={{ height: `${Math.max(day.items ? 4 : 0, (day.items / maxDailyActivity) * 100)}%` }} />
                          <span className="w-1/4 rounded-t-sm bg-amber-300/80" style={{ height: `${Math.max(day.proposals ? 4 : 0, (day.proposals / maxDailyActivity) * 100)}%` }} />
                          <span className="w-1/4 rounded-t-sm bg-emerald-300/80" style={{ height: `${Math.max(day.completions ? 4 : 0, (day.completions / maxDailyActivity) * 100)}%` }} />
                        </div>
                        <span className="mt-2 text-center text-[9px] text-white/25 sm:text-[10px]">
                          <span className="sm:hidden">{Number(day.day.slice(-2))}</span>
                          <span className="hidden sm:inline">
                            {shortDateFormatter.format(new Date(`${day.day}T12:00:00Z`)).replace(".", "")}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-5 sm:p-7">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-5 w-5 text-violet-300" />
                    <h2 className="text-xl font-semibold">Скорость ценности</h2>
                  </div>
                  <p className="mt-2 text-sm text-white/40">Медиана за 30 дней</p>

                  <div className="mt-7 space-y-5">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-white/40"><Box className="h-4 w-4" />Регистрация → первая вещь</div>
                      <strong className="mt-2 block text-2xl">{formatHours(dashboard.latency.medianFirstItemHours)}</strong>
                    </div>
                    <div className="h-px bg-white/[0.06]" />
                    <div>
                      <div className="flex items-center gap-2 text-xs text-white/40"><Users className="h-4 w-4" />Предложение → принятие</div>
                      <strong className="mt-2 block text-2xl">{formatHours(dashboard.latency.medianAcceptHours)}</strong>
                    </div>
                    <div className="h-px bg-white/[0.06]" />
                    <div>
                      <div className="flex items-center gap-2 text-xs text-white/40"><ShieldCheck className="h-4 w-4" />Принятие → завершение</div>
                      <strong className="mt-2 block text-2xl">{formatHours(dashboard.latency.medianCompleteHours)}</strong>
                    </div>
                  </div>
                </GlassCard>
              </section>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
