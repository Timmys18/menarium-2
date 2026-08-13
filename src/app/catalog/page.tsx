import type { Metadata } from "next";
import Link from "next/link";
import { Check, Clock, Heart, Plus, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { ItemType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { PreviewUiNotice } from "@/components/preview-ui-notice";
import { GlassCard, SurfaceCard } from "@/components/menarium/card";
import { MenariumLinkButton } from "@/components/menarium/button";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCard } from "@/components/menarium/item-card";
import { categories } from "@/features/items/sample-data";
import { buildCatalogHref, parseCatalogSort, type CatalogSort, CATALOG_PAGE_SIZE } from "@/features/items/catalog-url";
import { loadCatalogItemCards } from "@/features/items/load-item-cards";
import { prisma } from "@/lib/prisma";
import { cn, loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { CatalogCategoryFilter, CatalogCityFilter, CatalogFilterChip } from "./catalog-reference-filters";
import { CatalogScrollRestoration } from "@/components/catalog/catalog-scroll-restoration";
import { legacyCategoryId } from "@/features/taxonomy/catalog";
import { findCityByName, getCity } from "@/features/locations/cities";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Каталог обменов",
  description: "Каталог вещей и услуг для прямого обмена.",
};

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    city?: string;
    type?: string;
    sort?: string;
    page?: string;
  }>;
};

const sortOptions: { id: CatalogSort; label: string; icon: typeof Sparkles }[] = [
  { id: "trends", label: "Актуальные", icon: Sparkles },
  { id: "new", label: "Новые", icon: Clock },
  { id: "popular", label: "Популярные", icon: Heart },
];

const typeOptions = [
  { id: undefined, label: "Все" },
  { id: ItemType.THING, label: "Предметы" },
  { id: ItemType.SERVICE, label: "Услуги" },
] as const;

function filterLinkClass(active: boolean, compact = false) {
  return cn(
    "flex items-center justify-between gap-2 rounded-[13px] text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65",
    compact ? "min-h-11 min-w-0 justify-center px-2.5 py-2.5" : "min-h-11 w-full px-3 py-2.5",
    active
      ? "border border-teal-300/18 bg-teal-300/[0.085] text-white"
      : "border border-transparent text-white/62 hover:bg-white/[0.045] hover:text-white",
  );
}

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim();
  const category = params.category?.trim();
  const city = params.city?.trim();
  const parsedType = params.type === ItemType.THING || params.type === ItemType.SERVICE ? params.type : undefined;
  const sort = parseCatalogSort(params.sort);
  const page = Math.max(1, Number(params.page) || 1);
  const selectedCategory = category && category !== "Все" ? legacyCategoryId(category) ?? category : undefined;
  const selectedCity = city ? getCity(city)?.id ?? findCityByName(city)?.id ?? city : undefined;
  const catalogBase = { q, city: selectedCity, category: selectedCategory, type: parsedType, sort };
  const currentCatalogHref = buildCatalogHref({ ...catalogBase, page });

  const [{ cards, preview, total, hasMore }, userId] = await Promise.all([
    loadCatalogItemCards({
      q,
      category: selectedCategory,
      city: selectedCity,
      type: parsedType,
      sort,
      fallbackCategories: categories,
      page,
    }),
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
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const activeFilterCount = [selectedCategory, selectedCity, parsedType].filter(Boolean).length;
  const hasSearchControls = Boolean(q || activeFilterCount > 0 || sort !== "new");
  const typeLabel = typeOptions.find((entry) => entry.id === parsedType)?.label;

  return (
    <AppShell>
      {preview ? <PreviewUiNotice /> : null}
      <div className={`page-enter min-h-screen px-4 pb-32 sm:px-6 md:pt-32 ${preview ? "pt-36" : "pt-24"}`}>
        <CatalogScrollRestoration href={currentCatalogHref} />
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="type-kicker text-teal-200/70">Вещи и услуги рядом</p>
              <h1 className="type-page-title mt-2 text-4xl sm:text-5xl">
                Найдите встречный <span className="gradient-text">вариант</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              <div className="rounded-full border border-white/[0.075] bg-white/[0.035] px-4 py-2 text-sm text-white/62">
                Найдено: <span className="font-semibold text-white/85">{total}</span>
              </div>
              {hasSearchControls ? (
                <Link
                  href="/catalog"
                  scroll={false}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[13px] border border-white/10 bg-white/[0.035] px-3 text-sm text-white/70 transition hover:bg-white/[0.075] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65"
                >
                  <X className="h-4 w-4" />
                  Очистить
                </Link>
              ) : null}
              <MenariumLinkButton href="/new" size="sm" className="hidden sm:inline-flex">
                <Plus className="h-4 w-4" />
                Добавить своё
              </MenariumLinkButton>
            </div>
          </div>

          <form action="/catalog" className="sticky top-[72px] z-30 mb-6 md:static">
            <GlassCard className="flex items-center gap-2 rounded-[18px] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:gap-3 sm:p-2.5">
              <Search className="ml-2 h-5 w-5 shrink-0 text-white/62 sm:ml-3" />
              <label htmlFor="catalog-search" className="sr-only">
                Найти вещь или услугу
              </label>
              <input
                id="catalog-search"
                defaultValue={q}
                name="q"
                placeholder="Что вы ищете?"
                className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-base text-white outline-none placeholder:text-white/62 sm:text-lg"
              />
              {selectedCity ? <input type="hidden" name="city" value={selectedCity} /> : null}
              {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
              {parsedType ? <input type="hidden" name="type" value={parsedType} /> : null}
              {sort !== "new" ? <input type="hidden" name="sort" value={sort} /> : null}
              <button
                type="submit"
                aria-label="Найти"
                className="flex min-h-11 items-center justify-center rounded-[13px] border border-blue-300/20 bg-gradient-to-r from-blue-500 to-teal-400 px-4 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(77,141,255,0.18)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/75 sm:px-6"
              >
                <span className="hidden sm:inline">Найти</span>
                <Search className="h-4 w-4 sm:hidden" />
              </button>
            </GlassCard>
          </form>

          <div className="mb-6 space-y-3 lg:hidden">
            <div className="grid grid-cols-3 gap-1.5 rounded-[18px] border border-white/[0.075] bg-white/[0.025] p-1.5">
              {sortOptions.map((item) => {
                const Icon = item.icon;
                const active = sort === item.id;
                return (
                  <Link
                    key={item.id}
                    href={buildCatalogHref({ ...catalogBase, sort: item.id })}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(filterLinkClass(active, true), "flex-col gap-1 text-xs")}
                  >
                    <Icon className={cn("h-3.5 w-3.5", active ? "text-teal-200" : "text-white/62")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <details className="surface-card overflow-hidden rounded-[18px]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300/65 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <SlidersHorizontal className="h-4 w-4 text-teal-200" />
                  Фильтры
                </span>
                <span className="text-xs text-white/62">
                  {activeFilterCount > 0 ? `Выбрано: ${activeFilterCount}` : "Категория, тип, город"}
                </span>
              </summary>
              <div className="border-t border-white/[0.065] p-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/62">Тип предложения</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {typeOptions.map((entry) => {
                      const active = (entry.id === undefined && !parsedType) || entry.id === parsedType;
                      return (
                        <Link
                          key={entry.label}
                          href={buildCatalogHref({ ...catalogBase, type: entry.id })}
                          scroll={false}
                          aria-current={active ? "page" : undefined}
                          className={cn(filterLinkClass(active), "justify-center px-2 text-center")}
                        >
                          {entry.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/62">Категория</p>
                  <CatalogCategoryFilter value={selectedCategory} />
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/62">Город</p>
                  <CatalogCityFilter value={selectedCity} />
                </div>

                {activeFilterCount > 0 ? (
                  <Link
                    href={buildCatalogHref({ q, sort })}
                    scroll={false}
                    className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-[13px] border border-white/[0.075] bg-white/[0.035] px-4 py-3 text-sm text-white/78 transition hover:bg-white/[0.075] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65"
                  >
                    <X className="h-4 w-4" />
                    Сбросить фильтры
                  </Link>
                ) : null}
              </div>
            </details>

            {activeFilterCount > 0 || q ? (
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 text-xs">
                {q ? (
                  <Link href={buildCatalogHref({ ...catalogBase, q: undefined })} scroll={false} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-teal-300/15 bg-teal-300/[0.055] px-3 py-2 text-teal-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/75">
                    Запрос: {q} <X className="h-3 w-3" />
                  </Link>
                ) : null}
                <CatalogFilterChip kind="category" value={selectedCategory} />
                {parsedType ? (
                  <Link href={buildCatalogHref({ ...catalogBase, type: undefined })} scroll={false} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-white/78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65">
                    {typeLabel} <X className="h-3 w-3" />
                  </Link>
                ) : null}
                <CatalogFilterChip kind="city" value={selectedCity} />
              </div>
            ) : null}
          </div>

          <div className="flex gap-8">
            <aside className="hidden w-72 shrink-0 lg:block">
              <SurfaceCard className="sticky top-28 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Настроить выдачу</h2>
                  {activeFilterCount > 0 ? (
                    <Link href={buildCatalogHref({ q, sort })} scroll={false} className="inline-flex min-h-11 items-center px-2 text-xs text-teal-200/90 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65">
                      Сбросить
                    </Link>
                  ) : null}
                </div>

                <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-white/62">Сортировка</p>
                <div className="space-y-1">
                  {sortOptions.map((item) => {
                    const Icon = item.icon;
                    const active = sort === item.id;
                    return (
                      <Link key={item.id} href={buildCatalogHref({ ...catalogBase, sort: item.id })} scroll={false} aria-current={active ? "page" : undefined} className={filterLinkClass(active)}>
                        <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{item.label}</span>
                        {active ? <Check className="h-3.5 w-3.5 text-teal-200" /> : null}
                      </Link>
                    );
                  })}
                </div>

                <div className="my-5 h-px bg-white/[0.065]" />
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/62">Тип</p>
                <div className="space-y-1">
                  {typeOptions.map((entry) => {
                    const active = (entry.id === undefined && !parsedType) || entry.id === parsedType;
                    return (
                      <Link key={entry.label} href={buildCatalogHref({ ...catalogBase, type: entry.id })} scroll={false} aria-current={active ? "page" : undefined} className={filterLinkClass(active)}>
                        {entry.label}
                        {active ? <Check className="h-3.5 w-3.5 text-teal-200" /> : null}
                      </Link>
                    );
                  })}
                </div>

                <div className="my-5 h-px bg-white/[0.065]" />
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/62">Категории</p>
                <CatalogCategoryFilter value={selectedCategory} />

                <div className="my-5 h-px bg-white/[0.065]" />
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/62">Город</p>
                <CatalogCityFilter value={selectedCity} />
              </SurfaceCard>
            </aside>

            <section className="min-w-0 flex-1" aria-label="Результаты каталога">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">
                    {q ? `По запросу «${q}»` : activeFilterCount > 0 ? "Подходящие предложения" : "Все предложения"}
                  </h2>
                  <p className="mt-1 text-xs text-white/62">
                    {total} {total === 1 ? "предложение" : total >= 2 && total <= 4 ? "предложения" : "предложений"} · {sortOptions.find((option) => option.id === sort)?.label.toLowerCase()} · страница {page} из {totalPages}
                  </p>
                </div>
                <MenariumLinkButton href="/new" size="sm" className="sm:hidden">
                  <Plus className="h-4 w-4" />
                  Добавить
                </MenariumLinkButton>
              </div>
              {cards.length > 0 ? (
                <>
                  <div className="reveal-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
                    {cards.map((item, index) => (
                      <ItemCard
                        key={item.id}
                        {...item}
                        priority={index < 3}
                        returnHref={currentCatalogHref}
                        isFavorite={favoriteIds.has(item.id)}
                        canFavorite={Boolean(userId && item.ownerId !== userId)}
                        favoriteLoginHref={!userId ? loginHref(currentCatalogHref) : undefined}
                      />
                    ))}
                  </div>
                  {totalPages > 1 ? (
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                      {page > 1 ? (
                        <Link href={buildCatalogHref({ ...catalogBase, page: page - 1 })} className="inline-flex min-h-11 items-center rounded-[14px] border border-white/10 bg-white/[0.045] px-5 py-3 text-sm text-white/78 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/65">
                          ← Назад
                        </Link>
                      ) : null}
                      <span className="text-sm text-white/62">Страница {page} из {totalPages}</span>
                      {hasMore ? (
                        <Link href={buildCatalogHref({ ...catalogBase, page: page + 1 })} className="inline-flex min-h-11 items-center rounded-[14px] border border-blue-300/20 bg-gradient-to-r from-blue-500 to-teal-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(77,141,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/75">
                          Следующая страница →
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <EmptyState
                  title="Пока нет подходящих предложений"
                  description="Измените фильтры или создайте собственное объявление — встречный вариант может найтись с другой стороны."
                  actionHref={activeFilterCount > 0 || q ? "/catalog" : "/new"}
                  actionLabel={activeFilterCount > 0 || q ? "Сбросить поиск" : "Создать объявление"}
                />
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
