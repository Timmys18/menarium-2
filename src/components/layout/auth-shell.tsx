import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRightLeft, MessageCircle, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/menarium/brand";
import { GlassCard } from "@/components/menarium/card";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="page-enter relative flex min-h-dvh items-center px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[10%] top-0 h-56 rounded-full bg-blue-500/10 blur-[120px]"
      />
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)]">
        <aside className="relative hidden min-h-[680px] overflow-hidden rounded-panel border border-line-default bg-[var(--surface-card)]/78 p-10 shadow-[0_34px_100px_rgba(0,0,0,0.35)] lg:flex lg:flex-col xl:p-14">
          <div aria-hidden="true" className="dot-grid-bg absolute inset-0 opacity-55" />
          <div aria-hidden="true" className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-teal-400/15 blur-[100px]" />
          <div aria-hidden="true" className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-blue-500/16 blur-[110px]" />

          <Link
            href="/"
            aria-label="Менариум — на главную"
            className="relative inline-flex min-h-12 items-center self-start rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <BrandLockup priority markClassName="h-11 w-11 rounded-control" textClassName="text-2xl" />
          </Link>

          <div className="relative my-auto py-12">
            <h2 className="max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] xl:text-6xl">
              Меняйся. <span className="gradient-text">Просто</span>
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-text-subtle xl:text-lg">
              Вещь на вещь, услуга на услугу или услуга на вещь. Выбирайте вариант и договаривайтесь напрямую.
            </p>

            <div className="mt-9 grid gap-3 xl:grid-cols-3">
              {[
                { icon: ArrowRightLeft, number: "01", label: "Выберите вещь" },
                { icon: MessageCircle, number: "02", label: "Договоритесь" },
                { icon: ShieldCheck, number: "03", label: "Завершите обмен" },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="rounded-md border border-line-hairline bg-fill-1 p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-accent" />
                      <span className="font-display text-xs font-semibold text-text-subtle">{step.number}</span>
                    </div>
                    <p className="mt-5 text-sm font-medium text-text-muted">{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="relative flex items-center gap-2 text-sm text-text-subtle">
            <ShieldCheck className="h-4 w-4 text-accent" />
            Личные данные и история сделок доступны только вам.
          </p>
        </aside>

        <section className="flex min-w-0 flex-col justify-center lg:px-4">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              aria-label="Менариум — на главную"
              className="inline-flex min-h-12 items-center rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <BrandLockup priority />
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center gap-2 rounded-xs px-3 text-sm text-text-muted transition hover:bg-fill-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <ArrowLeft className="h-4 w-4" />
              На главную
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="type-page-title text-3xl sm:text-4xl">{title}</h1>
            <p className="type-supporting mt-3 max-w-md text-sm sm:text-base">{subtitle}</p>
          </div>

          <GlassCard className="relative overflow-hidden rounded-lg p-5 sm:rounded-lg sm:p-7">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/55 to-transparent" />
            {children}
          </GlassCard>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-text-subtle">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-soft" />
              Защищённое соединение
            </span>
            <Link href="/catalog" className="inline-flex min-h-11 items-center rounded-lg text-text-subtle transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
              Сначала посмотреть каталог
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
