import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AppShell mode="auth">
      <AuthShell title="Добро пожаловать" subtitle="Создай аккаунт и выставь первое объявление за пару минут.">
        <Suspense fallback={<div className="text-sm text-white/45">Загрузка формы...</div>}>
          <RegisterForm />
        </Suspense>
      </AuthShell>
    </AppShell>
  );
}
