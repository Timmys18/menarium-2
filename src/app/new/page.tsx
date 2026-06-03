import { Camera, Check, Sparkles, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";

const categories = [
  ["Техника", "💻"],
  ["Мода", "👟"],
  ["Музыка", "🎸"],
  ["Спорт", "⚽"],
  ["Книги", "📚"],
  ["Искусство", "🎨"],
];

const wants = ["iPhone 15", "MacBook Pro", "PlayStation 5", "AirPods Pro", "Nike Jordan", "Vintage камера"];

export default function NewItemPage() {
  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12">
            <div className="mb-4 flex items-center justify-center">
              {[1, 2, 3].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className="glow-purple flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-teal-500 to-purple-500 font-bold">
                    {step === 1 ? <Check className="h-6 w-6" /> : step}
                  </div>
                  {index < 2 ? (
                    <div className="mx-2 h-1 w-20 rounded-full bg-white/10 md:w-32">
                      <div className={index === 0 ? "h-full rounded-full bg-gradient-to-r from-teal-500 to-purple-500" : ""} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="text-center">
              <h1 className="mb-2 text-3xl font-bold md:text-4xl">Что предлагаешь?</h1>
              <p className="text-white/60">Сфотографируй предмет, выбери категорию и опиши обмен</p>
            </div>
          </div>

          <div className="space-y-6">
            <GlassCard className="cursor-pointer rounded-3xl border-2 border-dashed border-white/20 p-12 text-center transition-colors hover:border-purple-500/50">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500/20 to-purple-500/20">
                <Upload className="h-10 w-10 text-purple-400" />
              </div>
              <h3 className="mb-2 text-2xl font-bold">Загрузи фото</h3>
              <p className="mb-4 text-white/60">или перетащи сюда</p>
              <div className="flex items-center justify-center gap-4">
                <MenariumButton variant="secondary" size="sm">
                  <Camera className="h-5 w-5" />
                  Камера
                </MenariumButton>
                <MenariumButton variant="secondary" size="sm">
                  <Upload className="h-5 w-5" />
                  Галерея
                </MenariumButton>
              </div>
            </GlassCard>

            <GlassCard className="rounded-2xl border border-purple-500/30 p-6">
              <div className="mb-3 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <span className="gradient-text-accent font-semibold">AI подсказка</span>
              </div>
              <p className="text-white/80">
                После загрузки фото Menarium предложит категорию, описание и честный диапазон обмена.
              </p>
            </GlassCard>

            <section>
              <h3 className="mb-4 text-center text-xl font-bold">Или выбери категорию</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {categories.map(([name, emoji]) => (
                  <GlassCard key={name} className="p-6 text-center transition-transform hover:-translate-y-1">
                    <div className="mb-3 text-4xl">{emoji}</div>
                    <div className="font-semibold">{name}</div>
                  </GlassCard>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-xl font-bold">Что хочешь взамен?</h3>
              <div className="flex flex-wrap gap-2">
                {wants.map((want) => (
                  <Badge key={want} variant="purple">{want}</Badge>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
