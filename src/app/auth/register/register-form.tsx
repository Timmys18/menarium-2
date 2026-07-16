"use client";

import { useRef, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";
import { trackClientProductEvent } from "@/lib/product-analytics-client";

export function RegisterForm() {
  const router = useRouter();
  const hasTrackedStart = useRef(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, email, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Не удалось зарегистрироваться");
        return;
      }

      const verifyEmailSent = body.verifyEmailSent === true;

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        router.push(`/auth/login?registered=1&emailSent=${verifyEmailSent ? "1" : "0"}`);
        return;
      }

      router.push(`/profile?welcome=1&emailSent=${verifyEmailSent ? "1" : "0"}`);
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={submit}
      onFocusCapture={() => {
        if (hasTrackedStart.current) return;
        hasTrackedStart.current = true;
        void trackClientProductEvent({ name: "registration_started", path: "/auth/register" });
      }}
    >
      <div className="space-y-2">
        <label htmlFor="register-email" className="block text-sm font-medium text-white/75">
          Электронная почта
        </label>
        <MenariumInput
          id="register-email"
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
        <label htmlFor="register-password" className="block text-sm font-medium text-white/75">
          Пароль
        </label>
        <MenariumInput
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Не менее 8 символов"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="register-password-hint"
          required
        />
        <p id="register-password-hint" className="text-xs leading-5 text-white/40">
          Минимум 8 символов, обязательно буквы и цифры.
        </p>
      </div>

      <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Можно заполнить позже</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="space-y-2">
        <label htmlFor="register-name" className="block text-sm font-medium text-white/75">
          Имя
        </label>
        <MenariumInput
          id="register-name"
          name="name"
          autoComplete="name"
          placeholder="Как к вам обращаться"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="register-city" className="block text-sm font-medium text-white/75">
          Город
        </label>
        <MenariumInput
          id="register-city"
          name="city"
          autoComplete="address-level2"
          placeholder="Например, Москва"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />
      </div>
      <p className="text-xs leading-5 text-white/40">
        После регистрации мы предложим подтвердить почту. Если письмо задержится, его можно отправить повторно из профиля.
      </p>
      <p className="text-xs leading-relaxed text-white/40">
        Регистрируясь, вы соглашаетесь с{" "}
        <Link href="/terms" className="text-teal-300 hover:underline">
          пользовательским соглашением
        </Link>{" "}
        и{" "}
        <Link href="/privacy" className="text-teal-300 hover:underline">
          политикой конфиденциальности
        </Link>{" "}
        Menarium.
      </p>
      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">{error}</div> : null}
      <MenariumButton type="submit" className="w-full" disabled={isSubmitting || !email || password.length < 8}>
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Зарегистрироваться
      </MenariumButton>
      <MenariumLinkButton href="/auth/login" variant="secondary" className="w-full">
        Уже есть аккаунт
      </MenariumLinkButton>
    </form>
  );
}
