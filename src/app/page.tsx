import Link from "next/link";
import { ArrowRight, Check, Compass, MessageCircle, Plus, Repeat2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PreviewUiNotice } from "@/components/preview-ui-notice";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCard } from "@/components/menarium/item-card";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";
import { loadHomeItemCards } from "@/features/items/load-item-cards";
import { prisma } from "@/lib/prisma";
import { loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ cards, preview }, userId] = await Promise.all([
    loadHomeItemCards(),
    getCurrentUserId(),
  ]);
  const favoriteRows =
    userId && !preview && cards.length > 0
      ? await prisma.favorite.findMany({
          where: { userId, itemId: { in: cards.map((card) => card.id) } },
          select: { itemId: true },
        })
      : [];
  const favoriteIds = new Set(favoriteRows.map((favorite) => favorite.itemId));
  const heroPair = cards.slice(0, 2);

  return (
    <AppShell>
      {preview ? <PreviewUiNotice /> : null}
      <div className={`min-h-screen px-4 pb-28 sm:px-6 md:pb-32 md:pt-32 ${preview ? "pt-36" : "pt-24"}`}>
        <section className="mx-auto grid max-w-7xl gap-12 lg:min-h-[calc(100vh-9rem)] lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:gap-16">
          <div className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/[0.075] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-teal-200 sm:text-sm">
              <Repeat2 className="h-4 w-4" />
              Бартер, который работает
            </div>
            <h1 className="max-w-3xl text-[clamp(3.35rem,7vw,6.7rem)] font-semibold leading-[0.94] tracking-[-0.065em]">
              Вещи меняются. <span className="gradient-text">Ценность остаётся.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/58 sm:text-xl">
              Покажи, чем готов поделиться. Menarium найдёт встречное желание и поможет договориться без денег.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <MenariumLinkButton href="/new" size="lg" className="w-full sm:w-auto">
                <Plus className="h-5 w-5" />
                Разместить предложение
              </MenariumLinkButton>
              <MenariumLinkButton href="/catalog" size="lg" variant="secondary" className="w-full sm:w-auto">
                Открыть каталог
                <ArrowRight className="h-5 w-5" />
              </MenariumLinkButton>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/46">
              {[
                "Вещи и услуги",
                "Чат внутри обмена",
                "Без оплаты",
              ].map((label) => (
                <span key={label} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-300/10 text-teal-200">
                    <Check className="h-3 w-3" />
                  </span>
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative min-h-[470px] overflow-hidden rounded-[32px] border border-white/10 bg-[#0b111b]/72 p-5 shadow-[0_35px_100px_rgba(0,0,0,0.4)] sm:min-h-[540px] sm:p-8">
            <div aria-hidden="true" className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-teal-400/15 blur-[90px]" />
            <div aria-hidden="true" className="absolute -right-20 bottom-5 h-72 w-72 rounded-full bg-blue-500/16 blur-[100px]" />
            <div className="relative flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs text-white/55">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_12px_rgba(56,214,178,0.8)]" />
                Живой каталог
              </span>
              <span className="text-xs uppercase tracking-[0.16em] text-white/27">Встречное желание</span>
            </div>

            {heroPair.length === 2 ? (
              <div className="relative mt-6 h-[390px] sm:h-[445px]">
                {heroPair.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/item/${item.id}`}
                    className={`absolute w-[78%] max-w-sm overflow-hidden rounded-[24px] border border-white/12 bg-[#101722] shadow-[0_24px_70px_rgba(0,0,0,0.42)] transition hover:z-30 hover:-translate-y-1 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 ${
                      index === 0 ? "left-0 top-0 -rotate-2" : "bottom-0 right-0 rotate-2"
                    }`}
                  >
                    <div className="relative h-36 sm:h-44">
                      <ItemCoverImage
                        src={item.image}
                        alt={item.title}
                        priority
                        sizes="(max-width: 768px) 78vw, 360px"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#101722] to-transparent" />
                    </div>
                    <div className="p-4 sm:p-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-teal-200/72">{item.category}</p>
                      <h2 className="mt-1 line-clamp-1 text-base font-semibold sm:text-lg">{item.title}</h2>
                      <p className="mt-2 line-clamp-1 text-xs text-white/42">Ищу: {item.wanted}</p>
                    </div>
                  </Link>
                ))}
                <div className="absolute left-1/2 top-1/2 z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-[#111925]/95 text-teal-200 shadow-[0_16px_38px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  <Repeat2 className="h-6 w-6" />
                </div>
              </div>
            ) : (
              <div className="relative flex min-h-[390px] items-center justify-center text-center">
                <div>
                  <Compass className="mx-auto h-10 w-10 text-teal-200" />
                  <p className="mt-4 text-lg font-semibold">Первое совпадение начинается с предложения</p>
                  <p className="mt-2 text-sm text-white/45">Добавь вещь, навык или услугу.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-7xl md:mt-32">
          <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200/70">Можно начать прямо сейчас</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Предложения из каталога
              </h2>
              <p className="mt-2 text-sm text-white/45 sm:text-base">Вещи и услуги, которые уже ищут встречный вариант.</p>
            </div>
            <MenariumLinkButton href="/catalog" variant="secondary" size="sm" className="self-start sm:self-auto">
              Смотреть все
              <ArrowRight className="h-4 w-4" />
            </MenariumLinkButton>
          </div>
          {cards.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((item, index) => (
                <ItemCard
                  key={item.id}
                  {...item}
                  priority={index < 2}
                  isFavorite={favoriteIds.has(item.id)}
                  canFavorite={Boolean(userId && item.ownerId !== userId)}
                  favoriteLoginHref={!userId ? loginHref("/") : undefined}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Каталог готов к первым объявлениям"
              description="Как только пользователи создадут активные предложения, главная витрина начнёт показывать живые карточки."
              actionHref="/new"
              actionLabel="Создать объявление"
            />
          )}
        </section>

        <section className="mx-auto mt-28 max-w-7xl border-t border-white/[0.065] pt-20 md:mt-36 md:pt-24">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/70">Три понятных шага</p>
              <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.045em] md:text-5xl">
                От идеи до честного обмена
              </h2>
              <p className="mt-5 max-w-md leading-7 text-white/48">
                Menarium не оставляет тебя с объявлением один на один: каждый следующий шаг виден в личном кабинете.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Plus,
                  number: "01",
                  title: "Покажи ценность",
                  text: "Размести вещь, навык или услугу и напиши, что интересно взамен.",
                },
                {
                  icon: Compass,
                  number: "02",
                  title: "Найди совпадение",
                  text: "Используй каталог или свайп и предложи конкретный встречный вариант.",
                },
                {
                  icon: MessageCircle,
                  number: "03",
                  title: "Договорись",
                  text: "Обсуди детали в чате и подтверди результат вместе со второй стороной.",
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <GlassCard key={step.number} className="relative overflow-hidden p-6">
                    <span className="absolute right-5 top-4 font-display text-4xl font-semibold text-white/[0.055]">{step.number}</span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.055] text-teal-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/45">{step.text}</p>
                  </GlassCard>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-xs text-white/42">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-teal-200" />
              Статусы видны обеим сторонам
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-2">
              <MessageCircle className="h-4 w-4 text-blue-200" />
              История договорённостей остаётся в чате
            </span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
