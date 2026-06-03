import Image from "next/image";
import { ArrowRightLeft, Heart, Info, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { sampleItems } from "@/features/items/sample-data";

export default function SwipePage() {
  const card = sampleItems[0];

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              <span className="gradient-text">Свайп</span> обмена
            </h1>
            <p className="text-white/60">
              Листай как в Tinder: влево не интересно, вправо хочу обменять.
            </p>
          </div>

          <div className="relative flex h-[640px] items-center justify-center">
            <GlassCard className="absolute h-[600px] w-[420px] translate-y-8 scale-90 rounded-3xl opacity-40" />
            <GlassCard className="absolute h-[600px] w-[420px] translate-y-4 scale-95 rounded-3xl opacity-60" />
            <GlassCard className="relative h-[600px] w-full max-w-[450px] overflow-hidden rounded-3xl">
              <div className="relative h-[82%]">
                <Image src={card.image} alt={card.title} fill className="object-cover" />
                <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-xl">
                  <span className="text-xs tracking-wide text-white/90">{card.category}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
              </div>
              <div className="flex h-[18%] flex-col justify-center px-6 py-4">
                <h2 className="mb-2 text-xl tracking-tight">{card.title}</h2>
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-purple-400" />
                  <span className="tracking-wide">{card.wanted}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6">
            <button className="glass-card flex h-16 w-16 items-center justify-center rounded-full transition-colors hover:bg-red-500/20">
              <X className="h-8 w-8 text-red-400" />
            </button>
            <MenariumLinkButton href={`/item/${card.id}`} variant="secondary" className="h-16 w-16 rounded-full p-0">
              <Info className="h-7 w-7 text-blue-400" />
            </MenariumLinkButton>
            <MenariumLinkButton href={`/item/${card.id}`} className="h-16 w-16 rounded-full p-0">
              <Heart className="h-8 w-8 text-white" />
            </MenariumLinkButton>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
