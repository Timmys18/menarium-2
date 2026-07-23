"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";
import { getPasswordChecks, isPasswordReady } from "@/lib/password-policy";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordChecks = getPasswordChecks(password);
  const passwordReady = isPasswordReady(password);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isSubmitting) return;

    setError(null);
    if (!passwordReady) {
      setError("Пароль должен содержать не менее 8 символов, букву и цифру");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (!email || !token) {
      setError("Ссылка неполная. Запросите сброс пароля заново.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Не удалось сменить пароль");
        return;
      }
      router.push("/auth/login?passwordChanged=1");
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!email || !token) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Ссылка недействительна. Запросите сброс пароля заново.
        </div>
        <MenariumLinkButton href="/auth/forgot-password" className="w-full">
          Запросить ссылку
        </MenariumLinkButton>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-white/55">Придумайте новый пароль для {email}</p>
      <div className="space-y-2.5">
        <label htmlFor="reset-password" className="block text-sm font-medium text-white/75">
          Новый пароль
        </label>
        <div className="relative">
          <MenariumInput
            id="reset-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Придумайте надёжный пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby="reset-password-hint"
            className="pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Скрыть введённые символы" : "Показать введённые символы"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[14px] text-white/38 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300/70"
          >
            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>
        <div id="reset-password-hint" className="flex flex-wrap gap-2" aria-live="polite">
          {passwordChecks.map((check) => (
            <span
              key={check.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                check.passed
                  ? "border-teal-300/20 bg-teal-300/[0.08] text-teal-100"
                  : "border-white/8 bg-white/[0.025] text-white/32"
              }`}
            >
              <Check className="h-3 w-3" />
              {check.label}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        <label htmlFor="reset-password-confirm" className="block text-sm font-medium text-white/75">
          Повторите пароль
        </label>
        <MenariumInput
          id="reset-password-confirm"
          name="password-confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Введите пароль ещё раз"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={Boolean(confirm && password !== confirm)}
          required
        />
        {confirm ? (
          <p className={`text-xs ${password === confirm ? "text-teal-200" : "text-amber-200"}`} aria-live="polite">
            {password === confirm ? "Пароли совпадают" : "Пароли пока не совпадают"}
          </p>
        ) : null}
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
          {error}
        </div>
      ) : null}
      <MenariumButton
        type="submit"
        className="w-full"
        disabled={isSubmitting || !passwordReady || !confirm || password !== confirm}
      >
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Сохранить пароль
      </MenariumButton>
    </form>
  );
}
