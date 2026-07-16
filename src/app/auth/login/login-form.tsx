"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";
import { safeCallbackUrl } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordChanged = searchParams.get("passwordChanged") === "1";
  const registered = searchParams.get("registered") === "1";
  const registrationEmailSent = searchParams.get("emailSent") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError(
          result.error.includes("RATE_LIMITED")
            ? "Слишком много попыток входа. Попробуйте через несколько минут."
            : "Неверный email или пароль",
        );
        return;
      }

      router.push(safeCallbackUrl(searchParams.get("callbackUrl")));
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {passwordChanged ? (
        <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4 text-sm text-teal-100">
          Пароль изменён. Войдите заново, чтобы продолжить.
        </div>
      ) : null}
      {registered ? (
        <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4 text-sm leading-6 text-teal-100" role="status">
          Аккаунт создан. {registrationEmailSent ? "Письмо подтверждения отправлено." : "Войдите, а письмо подтверждения можно будет отправить из профиля."}
        </div>
      ) : null}
      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-sm font-medium text-white/75">
          Электронная почта
        </label>
        <MenariumInput
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="login-password" className="block text-sm font-medium text-white/75">
          Пароль
        </label>
        <MenariumInput
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Введите пароль"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <div className="text-right">
        <Link href="/auth/forgot-password" className="text-sm text-teal-300 hover:underline">
          Забыли пароль?
        </Link>
      </div>
      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">{error}</div> : null}
      <MenariumButton type="submit" className="w-full" disabled={isSubmitting || !email || !password}>
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Войти
      </MenariumButton>
      <MenariumLinkButton href="/auth/register" variant="secondary" className="w-full">
        Создать аккаунт
      </MenariumLinkButton>
    </form>
  );
}
