import { AppShell } from "@/components/layout/app-shell";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AppShell>
      <AuthShell title="Добро пожаловать" subtitle="Создай аккаунт и выставь первое объявление за пару минут.">
        <RegisterForm />
      </AuthShell>
    </AppShell>
  );
}
