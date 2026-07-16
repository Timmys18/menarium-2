"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { MenariumButton } from "@/components/menarium/button";

type DeliveryState = "unknown" | "sent" | "failed";

export function EmailVerifyBanner({
  email,
  initialDeliveryState = "unknown",
}: {
  email: string;
  initialDeliveryState?: DeliveryState;
}) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [deliveryState, setDeliveryState] = useState<DeliveryState>(initialDeliveryState);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setError(null);
    setMessage(null);
    setIsSending(true);
    try {
      const response = await fetch("/api/auth/verify-email", { method: "PUT" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDeliveryState("failed");
        setError(body.error ?? "Не удалось отправить письмо. Попробуйте ещё раз позже.");
        return;
      }
      if (body.data?.alreadyVerified === true) {
        setMessage("Почта уже подтверждена. Обновляем личный кабинет.");
        router.refresh();
        return;
      }
      setDeliveryState("sent");
      setMessage("Письмо отправлено — проверьте почту (и папку «Спам»).");
    } catch {
      setDeliveryState("failed");
      setError("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div id="verify-email" className="scroll-mt-28 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
          <div>
            <p className="font-medium text-amber-50">Подтвердите почту</p>
            <p className="mt-1 text-sm text-amber-100/80">
              {deliveryState === "sent"
                ? `Ссылка отправлена на ${email}. Проверьте почту и папку «Спам».`
                : deliveryState === "failed"
                  ? `Аккаунт работает, но письмо на ${email} пока не отправилось. Попробуйте ещё раз.`
                  : `Отправим ссылку на ${email}. Подтверждение помогает защитить аккаунт.`}
            </p>
            {message ? <p className="mt-2 text-sm text-teal-200" aria-live="polite">{message}</p> : null}
            {error ? <p className="mt-2 text-sm text-red-200" role="alert">{error}</p> : null}
          </div>
        </div>
        <MenariumButton variant="secondary" onClick={resend} disabled={isSending} className="shrink-0">
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {deliveryState === "sent" ? "Отправить снова" : "Отправить письмо"}
        </MenariumButton>
      </div>
    </div>
  );
}
