import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AppShell>
      <AuthShell title="С возвращением" subtitle="Войди — и продолжай обмены, чаты и свайп.">
        <Suspense fallback={<div className="text-sm text-white/45">Загрузка формы...</div>}>
          <LoginForm />
        </Suspense>
      </AuthShell>
    </AppShell>
  );
}
