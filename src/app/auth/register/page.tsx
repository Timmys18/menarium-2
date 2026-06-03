import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/menarium/card";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AppShell>
      <div className="flex min-h-screen items-center justify-center px-6 py-24">
        <GlassCard className="w-full max-w-md p-8">
          <h1 className="mb-2 text-3xl font-bold">Регистрация</h1>
          <p className="mb-6 text-white/55">Создай профиль и начни обмен.</p>
          <RegisterForm />
        </GlassCard>
      </div>
    </AppShell>
  );
}
