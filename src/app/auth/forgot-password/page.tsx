import { AppShell } from "@/components/layout/app-shell";
import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AppShell mode="auth">
      <AuthShell title="Забыли пароль?">
        <ForgotPasswordForm />
      </AuthShell>
    </AppShell>
  );
}
