import { Clock, Heart, Search, TrendingUp } from "lucide-react";
import { ItemStatus, ItemType, Prisma } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCard } from "@/components/menarium/item-card";
import { categories } from "@/features/items/sample-data";
import { buildCatalogHref, parseCatalogSort, type CatalogSort } from "@/features/items/catalog-url";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    city?: string;
    type?: string;
    sort?: string;
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
  const selectedCategory = category && category !== "Все" ? category : undefined;
  const catalogBase = { q, city, type: parsedType, sort };

  const where: Prisma.ItemWhereInput = {
    status: ItemStatus.ACTIVE,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(selectedCategory ? { category: selectedCategory } : {}),
    ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
    ...(parsedType ? { type: parsedType } : {}),
  };

  const orderBy =
    sort === "popular"
      ? { receivedSwaps: { _count: "desc" as const } }
      : sort === "trends"
        ? { updatedAt: "desc" as const }
        : { createdAt: "desc" as const };

  const [items, categoryRows, cityRows] = await Promise.all([
    prisma.item.findMany({
      where,
      include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
      orderBy,
      take: 60,
    }),
    prisma.item.findMany({
      where: { status: ItemStatus.ACTIVE },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.item.findMany({
      where: { status: ItemStatus.ACTIVE },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    }),
  ]);

  const liveCategories = ["Все", ...categoryRows.map((entry) => entry.category)];
  const categoryList = liveCategories.length > 1 ? liveCategories : categories;
  const cityList = cityRows.map((entry) => entry.city);
  const cards = items.map((item) => toItemCardView(serializeItem(item)));

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
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
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
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
                  Категории
                </h3>
                <div className="space-y-1.5">
                  {categoryList.map((entry) => (
                    <a
                      key={entry}
                      href={buildCatalogHref({ ...catalogBase, category: entry === "Все" ? undefined : entry })}
                      className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
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
                        className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                          !city ? "bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        Все города
                      </a>
                      {cityList.map((entry) => (
                        <a
                          key={entry}
                          href={buildCatalogHref({ ...catalogBase, city: entry })}
                          className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
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
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {cards.map((item) => (
                    <ItemCard key={item.id} {...item} />
                  ))}
                </div>
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
