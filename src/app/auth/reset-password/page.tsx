import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AppShell>
      <AuthShell title="Новый пароль" subtitle="Задайте надёжный пароль для входа.">
        <Suspense fallback={<div className="text-sm text-white/45">Загрузка...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </AuthShell>
    </AppShell>
  );
}
