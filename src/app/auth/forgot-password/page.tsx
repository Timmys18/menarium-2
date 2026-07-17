import { AppShell } from "@/components/layout/app-shell";
import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AppShell mode="auth">
      <AuthShell title="Забыли пароль?" subtitle="Восстановим доступ за пару минут.">
        <ForgotPasswordForm />
      </AuthShell>
    </AppShell>
  );
}
