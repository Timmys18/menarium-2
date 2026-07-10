import type { Metadata } from "next";
import { Clock, Heart, Search, TrendingUp } from "lucide-react";
import { ItemType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { PreviewUiNotice } from "@/components/preview-ui-notice";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCard } from "@/components/menarium/item-card";
import { categories } from "@/features/items/sample-data";
import { buildCatalogHref, parseCatalogSort, type CatalogSort, CATALOG_PAGE_SIZE } from "@/features/items/catalog-url";
import { loadCatalogItemCards } from "@/features/items/load-item-cards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Каталог обменов",
  description: "Ищи вещи и услуги для бартерного обмена на Menarium.",
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

const sortOptions: { id: CatalogSort; label: string; icon: typeof TrendingUp }[] = [
  { id: "trends", label: "Тренды", icon: TrendingUp },
  { id: "new", label: "Новые", icon: Clock },
  { id: "popular", label: "Популярные", icon: Heart },
];

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim();
  const category = params.category?.trim();
  const city = params.city?.trim();
  const parsedType = params.type === ItemType.THING || params.type === ItemType.SERVICE ? params.type : undefined;
  const sort = parseCatalogSort(params.sort);
  const page = Math.max(1, Number(params.page) || 1);
  const selectedCategory = category && category !== "Все" ? category : undefined;
  const catalogBase = { q, city, type: parsedType, sort };

  const { cards, preview, categoryList, cityList, total, hasMore } = await loadCatalogItemCards({
    q,
    category: selectedCategory,
    city,
    type: parsedType,
    sort,
    fallbackCategories: categories,
    page,
  });
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));

  return (
    <AppShell>
      {preview ? <PreviewUiNotice /> : null}
      <div className={`min-h-screen px-6 pb-32 md:pt-32 ${preview ? "pt-36" : "pt-24"}`}>
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-10">
            <h1 className="text-4xl font-bold md:text-5xl">
              Каталог <span className="gradient-text">обменов</span>
            </h1>
          </div>

          <form action="/catalog">
            <GlassCard className="mb-8 flex flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Search className="h-6 w-6 shrink-0 text-white/40" />
                <input
                  defaultValue={q}
                  name="q"
                  placeholder="Найти обмен..."
                  className="flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/40"
                />
              </div>
              {city ? <input type="hidden" name="city" value={city} /> : null}
              {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
              {parsedType ? <input type="hidden" name="type" value={parsedType} /> : null}
              {sort !== "new" ? <input type="hidden" name="sort" value={sort} /> : null}
            </GlassCard>
          </form>

          <div className="flex gap-8">
            <aside className="hidden w-72 shrink-0 lg:block">
              <GlassCard className="sticky top-32 p-6">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Сортировка
                </h3>
                <div className="mb-6 space-y-1.5">
                  {sortOptions.map((item) => {
                    const Icon = item.icon;
                    const active = sort === item.id;
                    return (
                      <a
                        key={item.id}
                        href={buildCatalogHref({ ...catalogBase, sort: item.id })}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                          active
                            ? "bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </a>
                    );
                  })}
                </div>

                <div className="mb-6 h-px bg-white/10" />

                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Тип
                </h3>
                <div className="mb-6 space-y-1.5">
                  {[
                    { id: undefined, label: "Все" },
                    { id: ItemType.THING, label: "Предметы" },
                    { id: ItemType.SERVICE, label: "Услуги" },
                  ].map((entry) => (
                    <a
                      key={entry.label}
                      href={buildCatalogHref({ ...catalogBase, type: entry.id })}
                      className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                        (entry.id === undefined && !parsedType) || entry.id === parsedType
                          ? "bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {entry.label}
                    </a>
                  ))}
                </div>

                <div className="mb-6 h-px bg-white/10" />

                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Категории
                </h3>
                <div className="space-y-1.5">
                  {categoryList.map((entry) => (
                    <a
                      key={entry}
                      href={buildCatalogHref({ ...catalogBase, category: entry === "Все" ? undefined : entry })}
                      className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                        (entry === "Все" && !selectedCategory) || entry === selectedCategory
                          ? "bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {entry}
                    </a>
                  ))}
                </div>

                {cityList.length > 0 ? (
                  <>
                    <div className="mb-6 mt-6 h-px bg-white/10" />
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                      Города
                    </h3>
                    <div className="space-y-1.5">
                      <a
                        href={buildCatalogHref({ ...catalogBase, city: undefined })}
                        className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                          !city ? "bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        Все города
                      </a>
                      {cityList.map((entry) => (
                        <a
                          key={entry}
                          href={buildCatalogHref({ ...catalogBase, city: entry })}
                          className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                            city?.toLowerCase() === entry.toLowerCase()
                              ? "bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white"
                              : "text-white/60 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {entry}
                        </a>
                      ))}
                    </div>
                  </>
                ) : null}
              </GlassCard>
            </aside>

            <section className="flex-1">
              {cards.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {cards.map((item) => (
                      <ItemCard key={item.id} {...item} />
                    ))}
                  </div>
                  {totalPages > 1 ? (
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                      {page > 1 ? (
                        <a
                          href={buildCatalogHref({ ...catalogBase, category: selectedCategory, page: page - 1 })}
                          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                          ← Назад
                        </a>
                      ) : null}
                      <span className="text-sm text-white/45">
                        Страница {page} из {totalPages}
                      </span>
                      {hasMore ? (
                        <a
                          href={buildCatalogHref({ ...catalogBase, category: selectedCategory, page: page + 1 })}
                          className="rounded-2xl bg-gradient-to-r from-teal-500 to-purple-500 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          Показать ещё →
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <EmptyState
                  title="Пока нет подходящих объявлений"
                  description="Каталог уже подключен к базе. Как только появятся активные объявления, они будут здесь."
                  actionHref="/new"
                  actionLabel="Создать объявление"
                />
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
