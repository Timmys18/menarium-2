import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRightLeft, MessageCircle, Repeat2, ShieldCheck } from "lucide-react";
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
        <aside className="relative hidden min-h-[680px] overflow-hidden rounded-[36px] border border-white/10 bg-[#0b111a]/78 p-10 shadow-[0_34px_100px_rgba(0,0,0,0.35)] lg:flex lg:flex-col xl:p-14">
          <div aria-hidden="true" className="dot-grid-bg absolute inset-0 opacity-55" />
          <div aria-hidden="true" className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-teal-400/15 blur-[100px]" />
          <div aria-hidden="true" className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-blue-500/16 blur-[110px]" />

          <Link
            href="/"
            aria-label="Menarium — на главную"
            className="relative inline-flex self-start items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/15 bg-gradient-to-br from-blue-500 to-teal-400 shadow-[0_12px_32px_rgba(77,141,255,0.24)]">
              <Repeat2 className="h-5 w-5" />
            </span>
            <span className="gradient-text font-display text-2xl font-bold tracking-[-0.04em]">MENARIUM</span>
          </Link>

          <div className="relative my-auto py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200/65">
              Обмен без лишнего
            </p>
            <h2 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] xl:text-6xl">
              Вещи снова обретают <span className="gradient-text">ценность</span>
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/66 xl:text-lg">
              Находи встречный интерес, договаривайся в чате и веди обмен по понятным статусам — всё в одном месте.
            </p>

            <div className="mt-9 grid gap-3 xl:grid-cols-3">
              {[
                { icon: ArrowRightLeft, number: "01", label: "Выбери вещь" },
                { icon: MessageCircle, number: "02", label: "Договорись" },
                { icon: ShieldCheck, number: "03", label: "Заверши обмен" },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="rounded-[20px] border border-white/8 bg-white/[0.04] p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-teal-200" />
                      <span className="font-display text-xs font-semibold text-white/48">{step.number}</span>
                    </div>
                    <p className="mt-5 text-sm font-medium text-white/76">{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="relative flex items-center gap-2 text-sm text-white/56">
            <ShieldCheck className="h-4 w-4 text-teal-200/75" />
            Личные данные и история сделок доступны только вам.
          </p>
        </aside>

        <section className="flex min-w-0 flex-col justify-center lg:px-4">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link
              href="/"
              aria-label="Menarium — на главную"
              className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-teal-400 shadow-[0_10px_24px_rgba(77,141,255,0.22)]">
                <Repeat2 className="h-4.5 w-4.5" />
              </span>
              <span className="gradient-text font-display text-xl font-bold tracking-[-0.04em]">MENARIUM</span>
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-white/64 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
            >
              <ArrowLeft className="h-4 w-4" />
              На главную
            </Link>
          </div>

          <div className="mb-7">
            <p className="type-kicker mb-2 text-teal-200/65">
              Личный доступ
            </p>
            <h1 className="type-page-title text-3xl sm:text-4xl">{title}</h1>
            <p className="type-supporting mt-3 max-w-md text-sm sm:text-base">{subtitle}</p>
          </div>

          <GlassCard className="relative overflow-hidden rounded-[26px] p-5 sm:rounded-[30px] sm:p-7">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/55 to-transparent" />
            {children}
          </GlassCard>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/54">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-200/65" />
              Защищённое соединение
            </span>
            <Link href="/catalog" className="rounded-lg text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70">
              Сначала посмотреть каталог
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
