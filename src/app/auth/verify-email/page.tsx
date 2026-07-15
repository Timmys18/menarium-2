import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { AuthShell } from "@/components/layout/auth-shell";
import { MenariumLinkButton } from "@/components/menarium/button";
import { consumeAuthToken, emailVerifyIdentifier } from "@/lib/auth-tokens";

type Props = {
  searchParams: Promise<{ email?: string; token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email?.trim().toLowerCase() ?? "";
  const token = params.token?.trim() ?? "";

  if (!email || !token) {
    return (
      <AppShell>
        <AuthShell title="Подтверждение email" subtitle="Ссылка неполная или устарела.">
          <div className="space-y-4 text-center">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              Ссылка недействительна. Запросите новое письмо в профиле.
            </div>
            <MenariumLinkButton href="/profile" variant="secondary" className="w-full">
              В профиль
            </MenariumLinkButton>
          </div>
        </AuthShell>
      </AppShell>
    );
  }

  const consumed = await consumeAuthToken(emailVerifyIdentifier(email), token, (tx) =>
    tx.user.update({
      where: { email },
      data: { emailVerified: new Date() },
      select: { id: true },
    }),
  );
  if (!consumed.ok) {
    return (
      <AppShell>
        <AuthShell title="Подтверждение email" subtitle="Ссылка не сработала.">
          <div className="space-y-4 text-center">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              Ссылка устарела или уже использована. Отправьте письмо повторно из профиля.
            </div>
            <MenariumLinkButton href="/profile" variant="secondary" className="w-full">
              В профиль
            </MenariumLinkButton>
          </div>
        </AuthShell>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AuthShell title="Готово!" subtitle="Email подтверждён — добро пожаловать в Menarium.">
        <div className="space-y-4 text-center">
          <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4 text-sm text-teal-100">
            Почта {email} подтверждена. Можно обмениваться и общаться в чатах.
          </div>
          <MenariumLinkButton href="/profile" className="w-full">
            Перейти в профиль
          </MenariumLinkButton>
          <Link href="/catalog" className="block text-sm text-teal-300 hover:underline">
            Открыть каталог
          </Link>
        </div>
      </AuthShell>
    </AppShell>
  );
}
