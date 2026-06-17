import { ArrowRight, Shield, Sparkles, TrendingUp, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PreviewUiNotice } from "@/components/preview-ui-notice";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCard } from "@/components/menarium/item-card";
import { loadHomeItemCards } from "@/features/items/load-item-cards";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { cards, preview } = await loadHomeItemCards();

  return (
    <AppShell>
      {preview ? <PreviewUiNotice /> : null}
      <div className={`min-h-screen px-6 pb-32 md:pt-32 ${preview ? "pt-36" : "pt-24"}`}>
        <section className="mx-auto max-w-7xl text-center">
          <div className="mb-6 inline-flex rounded-full border border-purple-500/30 bg-gradient-to-r from-teal-500/20 to-purple-500/20 px-6 py-2 backdrop-blur-xl">
            <span className="gradient-text-accent flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4" />
              Новая эра обмена
            </span>
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl lg:text-8xl">
            Меняйся <span className="gradient-text">просто</span>
          </h1>
          <p className="mx-auto mb-12 max-w-3xl text-xl text-white/60 md:text-2xl">
            Мечты по бартеру. Находи людей, которым нужен твой предмет, и получай то, что хочешь сам.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <MenariumLinkButton href="/new" size="lg">
              Начать обмен
              <ArrowRight className="h-5 w-5" />
            </MenariumLinkButton>
            <MenariumLinkButton href="/catalog" size="lg" variant="secondary">
              Смотреть каталог
            </MenariumLinkButton>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-3xl font-bold md:text-4xl">
              <span className="gradient-text">Каталог</span>
            </h2>
            <MenariumLinkButton href="/catalog" variant="secondary" size="sm">
              Смотреть все
              <ArrowRight className="h-4 w-4" />
            </MenariumLinkButton>
          </div>
          {cards.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((item) => (
                <ItemCard key={item.id} {...item} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Каталог готов к первым объявлениям"
              description="Как только пользователи создадут активные предложения, главная витрина начнет показывать живые карточки."
              actionHref="/new"
              actionLabel="Создать объявление"
            />
          )}
        </section>

        <section className="mx-auto mt-32 max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              Почему <span className="gradient-text">Menarium</span>?
            </h2>
            <p className="text-xl text-white/60">Мы переосмыслили обмен с нуля</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Интуитивно просто",
                text: "Создавай объявление быстро, а интерфейс поможет не потеряться в деталях.",
              },
              {
                icon: TrendingUp,
                title: "Быстрые матчи",
                text: "Каталог и свайп-лента помогают быстро понять, с кем можно обменяться.",
              },
              {
                icon: Shield,
                title: "Безопаснее",
                text: "Статусы, чаты, уведомления и подтверждения делают сделку прозрачной.",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <GlassCard key={feature.title} className="p-8">
                  <div className="glow-teal mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="mb-4 text-2xl font-bold">{feature.title}</h3>
                  <p className="leading-relaxed text-white/60">{feature.text}</p>
                </GlassCard>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
