"use client";

import { useRef, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, Loader2, UserRound } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";
import { CityPicker } from "@/components/menarium/city-picker";
import { getPasswordChecks, isPasswordReady } from "@/lib/password-policy";
import { trackClientProductEvent } from "@/lib/product-analytics-client";
import { safeCallbackUrl } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const hasTrackedStart = useRef(false);
  const [name, setName] = useState("");
  const [cityId, setCityId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordChecks = getPasswordChecks(password);
  const passwordReady = isPasswordReady(password);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cityId, email, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Не удалось зарегистрироваться");
        return;
      }

      const verifyEmailSent = body.verifyEmailSent === true;
      const profileDestination = `/profile?welcome=1&emailSent=${verifyEmailSent ? "1" : "0"}`;
      const destination = safeCallbackUrl(searchParams.get("callbackUrl"), profileDestination);

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        const loginSearch = new URLSearchParams({
          registered: "1",
          emailSent: verifyEmailSent ? "1" : "0",
          callbackUrl: destination,
        });
        router.push(`/auth/login?${loginSearch.toString()}`);
        return;
      }

      router.push(destination);
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={submit}
      onFocusCapture={() => {
        if (hasTrackedStart.current) return;
        hasTrackedStart.current = true;
        void trackClientProductEvent({ name: "registration_started", path: "/auth/register" });
      }}
    >
      <div className="rounded-[18px] border border-white/7 bg-white/[0.025] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200/65">Шаг 1 · Доступ</p>
        <p className="mt-1.5 text-sm text-white/62">Только почта и пароль — этого достаточно, чтобы начать.</p>
      </div>

      <div className="space-y-2.5">
        <label htmlFor="register-email" className="block text-sm font-medium text-white/75">
          Электронная почта
        </label>
        <MenariumInput
          id="register-email"
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
        <label htmlFor="register-password" className="block text-sm font-medium text-white/75">
          Пароль
        </label>
        <div className="relative">
          <MenariumInput
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Придумайте надёжный пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby="register-password-hint"
            className="pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Скрыть введённые символы" : "Показать введённые символы"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[14px] text-white/62 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300/70"
          >
            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>
        <div id="register-password-hint" className="flex flex-wrap gap-2" aria-live="polite">
          {passwordChecks.map((check) => (
            <span
              key={check.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                check.passed
                  ? "border-teal-300/20 bg-teal-300/[0.08] text-teal-100"
                  : "border-white/8 bg-white/[0.025] text-white/62"
              }`}
            >
              <Check className="h-3 w-3" />
              {check.label}
            </span>
          ))}
        </div>
      </div>

      <fieldset className="rounded-[18px] border border-white/8 bg-white/[0.025] p-4 sm:p-5">
        <legend className="sr-only">Профиль — необязательно</legend>
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-blue-400/10 text-blue-200">
            <UserRound className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200/65">Шаг 2 · Профиль</p>
            <p className="mt-1 text-sm text-white/62">Необязательно — можно заполнить сейчас или позже.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="register-name" className="block text-sm font-medium text-white/70">
              Имя
            </label>
            <MenariumInput
              id="register-name"
              name="name"
              autoComplete="name"
              placeholder="Как обращаться"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="register-city" className="block text-sm font-medium text-white/70">
              Город
            </label>
            <CityPicker id="register-city" value={cityId} onChange={(city) => setCityId(city.id)} />
          </div>
        </div>
      </fieldset>

      <p className="text-xs leading-5 text-white/62">
        После регистрации предложим подтвердить почту. Повторно отправить письмо всегда можно из профиля.
      </p>
      <p className="text-xs leading-relaxed text-white/62">
        Регистрируясь, вы соглашаетесь с{" "}
        <Link href="/terms" className="text-teal-300 hover:underline">
          пользовательским соглашением
        </Link>{" "}
        и{" "}
        <Link href="/privacy" className="text-teal-300 hover:underline">
          политикой конфиденциальности
        </Link>.
      </p>
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
          {error}
        </div>
      ) : null}
      <MenariumButton type="submit" className="w-full" disabled={isSubmitting || !email || !passwordReady}>
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Зарегистрироваться
      </MenariumButton>
      <MenariumLinkButton href={loginHref} variant="secondary" className="w-full">
        Уже есть аккаунт
      </MenariumLinkButton>
    </form>
  );
}
