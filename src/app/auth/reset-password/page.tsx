import { Suspense } from "react";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Новый пароль" subtitle="Задайте надёжный пароль для входа.">
      <Suspense fallback={<div className="text-sm text-text-subtle">Загрузка формы…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
