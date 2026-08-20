"use client";

import { useRef, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, UserRound } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";
import { CityPicker } from "@/components/menarium/city-picker";
import { PasswordChecklist } from "@/components/menarium/password-checklist";
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
  const [consentGiven, setConsentGiven] = useState(false);
  // Регистрация не подтверждает и не опровергает существование аккаунта.
  // Если вход сразу после отправки формы не удался, показываем нейтральный
  // экран «проверьте почту» — он одинаков и для занятого адреса, и для
  // случайного сбоя входа, поэтому по нему нельзя ничего заключить.
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);
  const passwordIdentity = { email, name };
  const passwordChecks = getPasswordChecks(password, passwordIdentity);
  const passwordReady = isPasswordReady(password, passwordIdentity);

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
        setAwaitingEmail(email);
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

  if (awaitingEmail) {
    return (
      <div className="space-y-5" role="status">
        <div className="rounded-md border border-teal-300/20 bg-teal-300/[0.07] p-5">
          <p className="type-kicker text-accent">Проверьте почту</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Мы отправили письмо на {awaitingEmail}</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Откройте письмо и следуйте ссылке, чтобы продолжить. Если письмо не пришло за пару минут, проверьте
            папку «Спам».
          </p>
        </div>
        <MenariumLinkButton href={loginHref} className="w-full">
          Перейти ко входу
        </MenariumLinkButton>
        <MenariumButton
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setAwaitingEmail(null)}
        >
          Ввести другой адрес
        </MenariumButton>
      </div>
    );
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
      <div className="rounded-md border border-line-hairline bg-fill-1 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft">Шаг 1 · Доступ</p>
        <p className="mt-1.5 text-sm text-text-subtle">Только почта и пароль — этого достаточно, чтобы начать.</p>
      </div>

      <div className="space-y-2.5">
        <label htmlFor="register-email" className="block text-sm font-medium text-text-muted">
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
        <label htmlFor="register-password" className="block text-sm font-medium text-text-muted">
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
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[14px] text-text-subtle transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]"
          >
            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>
        <div id="register-password-hint" className="flex flex-wrap gap-2" aria-live="polite">
          <PasswordChecklist checks={passwordChecks} />
        </div>
      </div>

      <fieldset className="rounded-md border border-line-hairline bg-fill-1 p-4 sm:p-5">
        <legend className="sr-only">Профиль — необязательно</legend>
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-blue-400/10 text-info">
            <UserRound className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-info-soft">Шаг 2 · Профиль</p>
            <p className="mt-1 text-sm text-text-subtle">Необязательно — можно заполнить сейчас или позже.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="register-name" className="block text-sm font-medium text-text-muted">
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
            <label htmlFor="register-city" className="block text-sm font-medium text-text-muted">
              Город
            </label>
            <CityPicker id="register-city" value={cityId} onChange={(city) => setCityId(city.id)} />
          </div>
        </div>
      </fieldset>

      <p className="text-xs leading-5 text-text-subtle">
        После регистрации предложим подтвердить почту. Повторно отправить письмо всегда можно из профиля.
      </p>
      {/*
        152-ФЗ требует активного действия пользователя, а не согласия «по факту
        нажатия кнопки»: отдельный чекбокс, снятый по умолчанию, — минимальная
        форма, которая этому удовлетворяет.
      */}
      <label
        htmlFor="register-consent"
        className="flex cursor-pointer items-start gap-3 rounded-control border border-line-hairline bg-fill-1 p-3.5 text-xs leading-relaxed text-text-muted transition hover:border-line-strong has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--focus-ring)]"
      >
        <input
          id="register-consent"
          name="consent"
          type="checkbox"
          checked={consentGiven}
          onChange={(event) => setConsentGiven(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-teal-400 focus-visible:outline-none"
          required
        />
        <span>
          Я согласен на обработку персональных данных и принимаю{" "}
          <Link href="/terms" className="text-accent underline underline-offset-2 hover:text-accent-soft">
            пользовательское соглашение
          </Link>{" "}
          и{" "}
          <Link href="/privacy" className="text-accent underline underline-offset-2 hover:text-accent-soft">
            политику конфиденциальности
          </Link>.
        </span>
      </label>
      {error ? (
        <div className="rounded-control border border-red-500/30 bg-red-500/10 p-4 text-sm text-danger" role="alert">
          {error}
        </div>
      ) : null}
      <MenariumButton
        type="submit"
        className="w-full"
        disabled={isSubmitting || !email || !passwordReady || !consentGiven}
      >
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Зарегистрироваться
      </MenariumButton>
      <MenariumLinkButton href={loginHref} variant="secondary" className="w-full">
        Уже есть аккаунт
      </MenariumLinkButton>
    </form>
  );
}
