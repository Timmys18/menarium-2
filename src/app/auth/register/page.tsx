import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AppShell mode="auth">
      <AuthShell title="Добро пожаловать">
        <Suspense fallback={<div className="text-sm text-white/62">Загрузка формы...</div>}>
          <RegisterForm />
        </Suspense>
      </AuthShell>
    </AppShell>
  );
}
