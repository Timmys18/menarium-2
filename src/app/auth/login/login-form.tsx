"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";
import { safeCallbackUrl } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordChanged = searchParams.get("passwordChanged") === "1";
  const registered = searchParams.get("registered") === "1";
  const registrationEmailSent = searchParams.get("emailSent") === "1";
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const registerHref = `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <form className="space-y-5" onSubmit={submit}>
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
      <div className="space-y-2.5">
        <label htmlFor="login-email" className="block text-sm font-medium text-white/75">
          Электронная почта
        </label>
        <MenariumInput
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="login-password" className="block text-sm font-medium text-white/75">
            Пароль
          </label>
          <Link
            href="/auth/forgot-password"
            className="rounded-lg text-sm text-teal-200/80 transition hover:text-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
          >
          Забыли пароль?
          </Link>
        </div>
        <div className="relative">
          <MenariumInput
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Введите пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Скрыть введённые символы" : "Показать введённые символы"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[14px] text-white/58 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300/70"
          >
            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
          {error}
        </div>
      ) : null}
      <MenariumButton type="submit" className="w-full" disabled={isSubmitting || !email || !password}>
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Войти
      </MenariumButton>

      <div className="flex items-center gap-3 py-0.5" aria-hidden="true">
        <span className="h-px flex-1 bg-white/8" />
        <span className="text-xs text-white/52">Первый раз здесь?</span>
        <span className="h-px flex-1 bg-white/8" />
      </div>
      <MenariumLinkButton href={registerHref} variant="secondary" className="w-full">
        Создать аккаунт
      </MenariumLinkButton>
      <p className="flex items-center justify-center gap-2 text-center text-xs text-white/54">
        <LockKeyhole className="h-3.5 w-3.5 text-teal-200/60" />
        Мы не передаём данные для входа другим пользователям.
      </p>
    </form>
  );
}
