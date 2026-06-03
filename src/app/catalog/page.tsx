import { Clock, Heart, Search, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/menarium/card";
import { ItemCard } from "@/components/menarium/item-card";
import { categories, sampleItems } from "@/features/items/sample-data";

export default function CatalogPage() {
  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-10">
            <h1 className="text-4xl font-bold md:text-5xl">
              Каталог <span className="gradient-text">обменов</span>
            </h1>
          </div>

          <GlassCard className="mb-8 flex items-center gap-4 rounded-2xl p-4">
            <Search className="h-6 w-6 text-white/40" />
            <input
              placeholder="Найти обмен..."
              className="flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/40"
            />
          </GlassCard>

          <div className="flex gap-8">
            <aside className="hidden w-72 shrink-0 lg:block">
              <GlassCard className="sticky top-32 p-6">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Сортировка
                </h3>
                <div className="mb-6 space-y-1.5">
                  {[
                    { label: "Тренды", icon: TrendingUp },
                    { label: "Новые", icon: Clock },
                    { label: "Популярные", icon: Heart },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                          index === 0
                            ? "bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mb-6 h-px bg-white/10" />

                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Категории
                </h3>
                <div className="space-y-1.5">
                  {categories.map((category, index) => (
                    <button
                      key={category}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                        index === 0
                          ? "bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </GlassCard>
            </aside>

            <section className="flex-1">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {sampleItems.map((item) => (
                  <ItemCard key={item.id} {...item} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
