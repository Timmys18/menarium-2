"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";
import { safeCallbackUrl } from "@/lib/utils";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, callbackUrl }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Не удалось отправить запрос");
        return;
      }
      setMessage(body.data?.message ?? "Проверьте почту — если аккаунт есть, мы отправили ссылку.");
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-white/62">Укажите email — мы пришлём ссылку для нового пароля.</p>
      <div className="space-y-2.5">
        <label htmlFor="forgot-password-email" className="block text-sm font-medium text-white/78">
          Электронная почта
        </label>
        <MenariumInput
          id="forgot-password-email"
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
      {error ? (
        <div className="rounded-control border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div
          className="rounded-control border border-teal-500/30 bg-teal-500/10 p-4 text-sm text-teal-100"
          role="status"
        >
          {message}
        </div>
      ) : null}
      <MenariumButton type="submit" className="w-full" disabled={isSubmitting || !email}>
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Отправить ссылку
      </MenariumButton>
      <MenariumLinkButton href={loginHref} variant="secondary" className="w-full">
        Назад ко входу
      </MenariumLinkButton>
    </form>
  );
}
