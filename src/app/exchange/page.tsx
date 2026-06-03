import Image from "next/image";
import { CheckCircle2, MessageCircle, RotateCcw, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { MenariumButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { sampleItems } from "@/features/items/sample-data";

const swaps = [
  { id: "sw-demo-1", partner: "Мария К.", their: sampleItems[3], yours: sampleItems[0], status: "PENDING", tab: "incoming" },
  { id: "sw-demo-2", partner: "Дмитрий П.", their: sampleItems[1], yours: sampleItems[5], status: "ACCEPTED", tab: "matches" },
  { id: "sw-demo-3", partner: "Анна С.", their: sampleItems[4], yours: sampleItems[2], status: "PENDING", tab: "outgoing" },
];

export default function ExchangePage() {
  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold md:text-5xl">
                Центр <span className="gradient-text">обменов</span>
              </h1>
              <p className="mt-3 text-white/60">Управляй входящими, исходящими и матчами в одном месте.</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="teal">Входящие 1</Badge>
              <Badge variant="purple">Матчи 1</Badge>
              <Badge>Исходящие 1</Badge>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <GlassCard className="p-6">
              <div className="mb-6 flex gap-2 overflow-x-auto">
                {["Вам предложили", "Вы предложили", "Матчи"].map((tab, index) => (
                  <button
                    key={tab}
                    className={`rounded-2xl px-5 py-3 text-sm font-medium ${
                      index === 0
                        ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                        : "bg-white/5 text-white/50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {swaps.map((swap) => (
                  <GlassCard key={swap.id} className="group overflow-hidden">
                    <div className="relative h-52">
                      <Image src={swap.their.image} alt={swap.their.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute left-3 top-3 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs backdrop-blur-xl">
                        {swap.partner}
                      </div>
                      <div className="absolute bottom-3 right-3 flex gap-2 opacity-100 transition-opacity">
                        <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 hover:bg-red-500/80">
                          <XCircle className="h-4 w-4" />
                        </button>
                        <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-purple-500">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="text-sm text-white/95">{swap.their.title}</h3>
                        <Badge variant={swap.status === "ACCEPTED" ? "teal" : "glass"}>{swap.status}</Badge>
                      </div>
                      <p className="text-xs text-white/45">За ваше: {swap.yours.title}</p>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-purple-500/20">
                  <MessageCircle className="h-5 w-5 text-teal-300" />
                </div>
                <div>
                  <h2 className="font-semibold">Чат сделки</h2>
                  <p className="text-xs text-white/35">Откроется после принятия обмена</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">Привет! Можем встретиться завтра в центре?</div>
                <div className="ml-8 rounded-2xl bg-gradient-to-r from-teal-500/20 to-purple-500/20 p-4 text-sm text-white/80">Да, давай обсудим место.</div>
              </div>
              <div className="mt-5 flex gap-2">
                <input className="glass-card min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-white/35" placeholder="Сообщение..." />
                <MenariumButton size="sm">Отправить</MenariumButton>
              </div>
              <button className="mt-6 flex items-center gap-2 text-sm text-white/45">
                <RotateCcw className="h-4 w-4" />
                История обновляется автоматически
              </button>
            </GlassCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
