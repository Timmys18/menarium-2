import Link from "next/link";
import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MenariumLinkButton } from "@/components/menarium/button";
import { EmptyState } from "@/components/menarium/empty-state";
import { loginHref } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { ProfileEditForm } from "./profile-edit-form";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, city: true, image: true },
      })
    : null;

  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/profile"
            className="mb-6 inline-flex items-center gap-2 text-sm text-white/48 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад в профиль
          </Link>
          <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/60">
                Аккаунт
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Настройки профиля</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/52 sm:text-base">
                Управляйте тем, как вас видят другие участники, доступом и безопасностью аккаунта.
              </p>
            </div>
            {user ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <MenariumLinkButton href={`/user/${user.id}`} variant="secondary" size="sm">
                  <UserRound className="h-4 w-4" />
                  Публичный профиль
                </MenariumLinkButton>
                <MenariumLinkButton href="/profile/safety" variant="secondary" size="sm">
                  <ShieldCheck className="h-4 w-4" />
                  Безопасность
                </MenariumLinkButton>
              </div>
            ) : null}
          </div>
          {user ? (
            <ProfileEditForm user={user} />
          ) : (
            <EmptyState
              title="Войдите, чтобы редактировать профиль"
              description="Настройки профиля доступны только авторизованному пользователю."
              actionHref={loginHref("/profile/edit")}
              actionLabel="Войти"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
