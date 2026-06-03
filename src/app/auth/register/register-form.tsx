"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
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

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        router.push("/auth/login");
        return;
      }

      router.push("/profile");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <MenariumInput placeholder="Имя" value={name} onChange={(event) => setName(event.target.value)} />
      <MenariumInput placeholder="Город" value={city} onChange={(event) => setCity(event.target.value)} />
      <MenariumInput type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <MenariumInput
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
        }}
      />
      <p className="text-xs leading-relaxed text-white/40">
        Регистрируясь, вы соглашаетесь с пользовательским соглашением и политикой конфиденциальности Menarium.
      </p>
      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      <MenariumButton className="w-full" onClick={submit} disabled={isSubmitting || !email || password.length < 8}>
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Зарегистрироваться
      </MenariumButton>
      <MenariumLinkButton href="/auth/login" variant="secondary" className="w-full">
        Уже есть аккаунт
      </MenariumLinkButton>
    </div>
  );
}
