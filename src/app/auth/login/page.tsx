import { AppShell } from "@/components/layout/app-shell";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { MenariumInput } from "@/components/menarium/input";

export default function LoginPage() {
  return (
    <AppShell>
      <div className="flex min-h-screen items-center justify-center px-6 py-24">
        <GlassCard className="w-full max-w-md p-8">
          <h1 className="mb-2 text-3xl font-bold">Вход</h1>
          <p className="mb-6 text-white/55">Вернись к своим обменам и чатам.</p>
          <div className="space-y-4">
            <MenariumInput type="email" placeholder="Email" />
            <MenariumInput type="password" placeholder="Пароль" />
            <MenariumButton className="w-full">Войти</MenariumButton>
            <MenariumLinkButton href="/auth/register" variant="secondary" className="w-full">
              Создать аккаунт
            </MenariumLinkButton>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
