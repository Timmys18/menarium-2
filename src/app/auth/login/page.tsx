import { Suspense } from "react";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthShell title="С возвращением" subtitle="Войдите и продолжайте обмены, чаты и свайп.">
      <Suspense fallback={<div className="text-sm text-text-subtle">Загрузка формы…</div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
