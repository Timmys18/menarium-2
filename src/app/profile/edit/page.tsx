import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/menarium/empty-state";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { ProfileEditForm } from "./profile-edit-form";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, city: true, image: true },
      })
    : null;

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold">Редактировать профиль</h1>
          {user ? (
            <ProfileEditForm user={user} />
          ) : (
            <EmptyState
              title="Войдите, чтобы редактировать профиль"
              description="Настройки профиля доступны только авторизованному пользователю."
              actionHref="/auth/login"
              actionLabel="Войти"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
