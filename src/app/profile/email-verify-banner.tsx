"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";

export function EmailVerifyBanner({ email }: { email: string }) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setError(null);
    setMessage(null);
    setIsSending(true);
    try {
      const response = await fetch("/api/auth/verify-email", { method: "PUT" });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Не удалось отправить письмо");
        return;
      }
      setMessage("Письмо отправлено — проверьте почту (и папку «Спам»).");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
          <div>
            <p className="font-medium text-amber-50">Подтвердите email</p>
            <p className="mt-1 text-sm text-amber-100/80">
              Мы отправили ссылку на {email}. Подтверждение помогает защитить аккаунт.
            </p>
            {message ? <p className="mt-2 text-sm text-teal-200">{message}</p> : null}
            {error ? <p className="mt-2 text-sm text-red-200">{error}</p> : null}
          </div>
        </div>
        <MenariumButton variant="secondary" onClick={resend} disabled={isSending} className="shrink-0">
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Отправить снова
        </MenariumButton>
      </div>
    </div>
  );
}
