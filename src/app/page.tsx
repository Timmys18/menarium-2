import Link from "next/link";
import { ItemStatus } from "@prisma/client";
import { ArrowRight, Compass, MessageCircle, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PreviewUiNotice } from "@/components/preview-ui-notice";
import { BrandMark } from "@/components/menarium/brand";
import { MenariumLinkButton } from "@/components/menarium/button";
import { SurfaceCard } from "@/components/menarium/card";
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
  const [favoriteRows, activeItemCount] = await Promise.all([
    userId && !preview && cards.length > 0
      ? prisma.favorite.findMany({
          where: { userId, itemId: { in: cards.map((card) => card.id) } },
          select: { itemId: true },
        })
      : Promise.resolve([]),
    userId
      ? prisma.item.count({ where: { ownerId: userId, status: ItemStatus.ACTIVE } })
      : Promise.resolve(0),
  ]);
  const favoriteIds = new Set(favoriteRows.map((favorite) => favorite.itemId));
  const heroPair = cards.slice(0, 2);
  const primaryAction = !userId
    ? {
        href: loginHref("/new"),
        label: "Создать объявление",
      }
    : activeItemCount === 0
      ? {
          href: "/new",
          label: "Добавить объявление",
        }
      : {
          href: "/new",
          label: "Добавить объявление",
        };

  return (
    <AppShell>
      {preview ? <PreviewUiNotice /> : null}
      <div className={`min-h-screen px-4 pb-28 sm:px-6 md:pb-32 md:pt-32 ${preview ? "pt-36" : "pt-24"}`}>
        <section className="mx-auto grid max-w-7xl gap-12 lg:min-h-[calc(100vh-9rem)] lg:grid-cols-[1.03fr_0.97fr] lg:items-center lg:gap-16">
          <div className="relative z-10">
            <h1 className="type-page-title max-w-3xl text-[clamp(3.35rem,5.2vw,5rem)] leading-[0.94] tracking-[-0.065em] lg:whitespace-nowrap">
              Меняйся. <span className="gradient-text">Просто</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
              Меняйте вещи на вещи, услуги на услуги или услуги на вещи. Выбирайте подходящий вариант и договаривайтесь напрямую.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <MenariumLinkButton href={primaryAction.href} size="lg" className="w-full sm:w-auto">
                <Plus className="h-5 w-5" />
                {primaryAction.label}
              </MenariumLinkButton>
              <MenariumLinkButton href="/catalog" size="lg" variant="secondary" className="w-full sm:w-auto">
                Открыть каталог
                <ArrowRight className="h-5 w-5" />
              </MenariumLinkButton>
            </div>
          </div>

          <div className="hero-canvas relative min-h-[470px] overflow-hidden rounded-[32px] p-5 sm:min-h-[540px] sm:p-8">
            <div aria-hidden="true" className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-teal-400/15 blur-[90px]" />
            <div aria-hidden="true" className="absolute -right-20 bottom-5 h-72 w-72 rounded-full bg-blue-500/16 blur-[100px]" />
            {heroPair.length === 2 ? (
              <div className="relative h-[430px] sm:h-[480px]">
                {heroPair.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/item/${item.id}`}
                    className={`absolute w-[78%] max-w-sm overflow-hidden rounded-[24px] border border-white/[0.13] bg-[#101722] shadow-[0_24px_70px_rgba(0,0,0,0.42)] transition hover:z-30 hover:-translate-y-1 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 ${
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
                      <p className="mt-2 line-clamp-1 text-xs text-white/62">Ищу: {item.wanted}</p>
                    </div>
                  </Link>
                ))}
                <BrandMark
                  size="lg"
                  className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 ring-white/20"
                />
              </div>
            ) : (
              <div className="relative flex min-h-[390px] items-center justify-center text-center">
                <div>
                  <Compass className="mx-auto h-10 w-10 text-teal-200" />
                  <p className="mt-4 text-lg font-semibold">Предложений пока нет</p>
                  <p className="mt-2 text-sm text-white/62">Добавьте вещь или услугу.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-7xl md:mt-32">
          <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Предложения из каталога
              </h2>
            </div>
            <MenariumLinkButton href="/catalog" variant="secondary" size="sm" className="self-start sm:self-auto">
              Смотреть все
              <ArrowRight className="h-4 w-4" />
            </MenariumLinkButton>
          </div>
          {cards.length > 0 ? (
            <div className="reveal-grid grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
              title="Объявлений пока нет"
              description="Добавьте вещь или услугу, чтобы она появилась в каталоге."
              actionHref="/new"
              actionLabel="Создать объявление"
            />
          )}
        </section>

        <section className="mx-auto mt-28 max-w-7xl border-t border-white/[0.065] pt-20 md:mt-36 md:pt-24">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div>
              <h2 className="text-4xl font-semibold leading-tight tracking-[-0.045em] md:text-5xl">
                Как работает обмен
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Plus,
                  number: "01",
                  title: "Опубликуйте",
                  text: "Добавьте вещь или услугу и укажите, что хотите получить.",
                },
                {
                  icon: Compass,
                  number: "02",
                  title: "Предложите обмен",
                  text: "Выберите чужое объявление и предложите своё взамен.",
                },
                {
                  icon: MessageCircle,
                  number: "03",
                  title: "Договоритесь",
                  text: "Обсудите детали в чате. После обмена обе стороны подтверждают завершение.",
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <SurfaceCard key={step.number} className="relative overflow-hidden p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.05] text-teal-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/62">{step.text}</p>
                  </SurfaceCard>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
