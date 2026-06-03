import { AppShell } from "@/components/layout/app-shell";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { MenariumInput } from "@/components/menarium/input";

export default function ProfileEditPage() {
  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold">Редактировать профиль</h1>
          <GlassCard className="space-y-5 p-8">
            <MenariumInput placeholder="Имя" defaultValue="Menarium пользователь" />
            <MenariumInput placeholder="Город" defaultValue="Москва" />
            <MenariumInput placeholder="Фото профиля URL" />
            <div className="flex gap-3">
              <MenariumButton>Сохранить</MenariumButton>
              <MenariumLinkButton href="/profile" variant="secondary">Отмена</MenariumLinkButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
