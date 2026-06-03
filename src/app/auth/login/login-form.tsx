"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { MenariumInput } from "@/components/menarium/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Неверный email или пароль");
        return;
      }

      router.push(searchParams.get("callbackUrl") || "/profile");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
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
      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      <MenariumButton className="w-full" onClick={submit} disabled={isSubmitting || !email || !password}>
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Войти
      </MenariumButton>
      <MenariumLinkButton href="/auth/register" variant="secondary" className="w-full">
        Создать аккаунт
      </MenariumLinkButton>
    </div>
  );
}
