import { AppShell } from "@/components/layout/app-shell";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { MenariumInput } from "@/components/menarium/input";

export default function RegisterPage() {
  return (
    <AppShell>
      <div className="flex min-h-screen items-center justify-center px-6 py-24">
        <GlassCard className="w-full max-w-md p-8">
          <h1 className="mb-2 text-3xl font-bold">Регистрация</h1>
          <p className="mb-6 text-white/55">Создай профиль и начни обмен.</p>
          <div className="space-y-4">
            <MenariumInput placeholder="Имя" />
            <MenariumInput placeholder="Город" />
            <MenariumInput type="email" placeholder="Email" />
            <MenariumInput type="password" placeholder="Пароль" />
            <MenariumButton className="w-full">Зарегистрироваться</MenariumButton>
            <MenariumLinkButton href="/auth/login" variant="secondary" className="w-full">
              Уже есть аккаунт
            </MenariumLinkButton>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
