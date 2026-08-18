import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AppShell mode="auth">
      <AuthShell title="Новый пароль" subtitle="Задайте надёжный пароль для входа.">
        <Suspense fallback={<div className="text-sm text-text-subtle">Загрузка...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </AuthShell>
    </AppShell>
  );
}
