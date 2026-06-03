import { ArrowRightLeft, CheckCircle2, MessageCircle, Star, Tag } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";

export default function ProfilePage() {
  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-28">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <GlassCard className="rounded-3xl p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-purple-600 shadow-lg shadow-teal-500/20">
                    <span className="text-2xl font-bold">МК</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-[#0a0a0f] bg-teal-500" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/30">Личный кабинет</p>
                  <h1 className="mb-1 text-3xl tracking-tight">Menarium пользователь</h1>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                    <span>user@menarium.ru</span>
                    <span>Москва</span>
                    <span className="flex items-center gap-1 text-yellow-400"><Star className="h-3 w-3 fill-yellow-400" />4.9</span>
                  </div>
                </div>
              </div>
              <MenariumLinkButton href="/profile/edit" variant="secondary">Редактировать профиль</MenariumLinkButton>
            </div>
          </GlassCard>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Активных объявлений", value: 5, icon: Tag, color: "text-teal-400" },
              { label: "Активных обменов", value: 3, icon: ArrowRightLeft, color: "text-purple-400" },
              { label: "Завершенных обменов", value: 12, icon: CheckCircle2, color: "text-green-400" },
              { label: "Чатов", value: 8, icon: MessageCircle, color: "text-blue-400" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <GlassCard key={item.label} className="p-5">
                  <Icon className={`mb-3 h-5 w-5 ${item.color}`} />
                  <div className="text-3xl font-semibold">{item.value}</div>
                  <p className="mt-1 text-xs text-white/40">{item.label}</p>
                </GlassCard>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <GlassCard className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl tracking-tight">Центр обменов</h2>
                  <p className="text-xs text-white/35">Последние предложения и матчи</p>
                </div>
                <MenariumLinkButton href="/exchange" variant="ghost" size="sm">Полный режим</MenariumLinkButton>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {["Вам предложили", "Вы предложили", "Матчи"].map((title) => (
                  <GlassCard key={title} className="p-5">
                    <h3 className="mb-2 font-semibold">{title}</h3>
                    <p className="text-sm text-white/45">Новые события появятся здесь.</p>
                  </GlassCard>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="mb-4 text-xl tracking-tight">Быстрые действия</h2>
              <div className="space-y-3">
                <MenariumLinkButton href="/new" className="w-full">Создать объявление</MenariumLinkButton>
                <MenariumLinkButton href="/my-items" variant="secondary" className="w-full">Мои объявления</MenariumLinkButton>
                <MenariumLinkButton href="/profile/chats" variant="secondary" className="w-full">Мои чаты</MenariumLinkButton>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
