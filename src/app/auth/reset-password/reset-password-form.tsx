"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
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
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Не удалось сменить пароль");
        return;
      }
      router.push("/auth/login");
      router.refresh();
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
    <div className="space-y-4">
      <p className="text-sm text-white/55">Придумайте новый пароль для {email}</p>
      <MenariumInput
        type="password"
        placeholder="Новый пароль"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <MenariumInput
        type="password"
        placeholder="Повторите пароль"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
        }}
      />
      <p className="text-xs text-white/40">Минимум 8 символов, буквы и цифры.</p>
      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      <MenariumButton className="w-full" onClick={submit} disabled={isSubmitting || password.length < 8 || !confirm}>
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Сохранить пароль
      </MenariumButton>
    </div>
  );
}
