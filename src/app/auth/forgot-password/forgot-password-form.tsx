"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Не удалось отправить запрос");
        return;
      }
      setMessage(body.data?.message ?? "Проверьте почту — если аккаунт есть, мы отправили ссылку.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/55">Укажите email — мы пришлём ссылку для нового пароля.</p>
      <MenariumInput
        type="email"
        placeholder="Электронная почта"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
        }}
      />
      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4 text-sm text-teal-100">{message}</div> : null}
      <MenariumButton className="w-full" onClick={submit} disabled={isSubmitting || !email}>
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Отправить ссылку
      </MenariumButton>
      <MenariumLinkButton href="/auth/login" variant="secondary" className="w-full">
        Назад ко входу
      </MenariumLinkButton>
    </div>
  );
}
