import { ShieldCheck, UserRound } from "lucide-react";
import { MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { EmptyState } from "@/components/menarium/empty-state";
import { loginHref } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { ProfileEditForm } from "./profile-edit-form";
import { EmailVerifyBanner } from "../email-verify-banner";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          city: true,
          cityId: true,
          image: true,
          email: true,
          emailVerified: true,
        },
      })
    : null;

  return (
    <div className="max-w-3xl">
          <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/60">
                Аккаунт
              </p>
              <h1 className="type-page-title text-3xl sm:text-4xl">Настройки профиля</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/62 sm:text-base">
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
            <>
              <ProfileEditForm user={user} />
              {!user.emailVerified ? (
                <GlassCard className="mt-5 border border-white/8 px-4 sm:px-5">
                  <EmailVerifyBanner email={user.email} compact />
                </GlassCard>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Войдите, чтобы редактировать профиль"
              description="Настройки профиля доступны только авторизованному пользователю."
              actionHref={loginHref("/profile/edit")}
              actionLabel="Войти"
            />
          )}
    </div>
  );
}
