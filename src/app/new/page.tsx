import { Sparkles } from "lucide-react";
import { ItemStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/menarium/empty-state";
import { parseItemReturnPath } from "@/lib/item-return-path";
import { loginHref } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { NewItemForm } from "./new-item-form";

export const dynamic = "force-dynamic";

type NewItemPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function NewItemPage({ searchParams }: NewItemPageProps) {
  const requestedReturn = parseItemReturnPath((await searchParams).returnTo);
  const userId = await getCurrentUserId();
  const continuation = requestedReturn
    ? await prisma.item.findFirst({
        where: {
          id: requestedReturn.itemId,
          status: ItemStatus.ACTIVE,
          ...(userId ? { ownerId: { not: userId } } : {}),
        },
        select: { title: true },
      })
    : null;
  const returnTo = continuation ? requestedReturn?.path ?? null : null;
  const currentPath = returnTo ? `/new?returnTo=${encodeURIComponent(returnTo)}` : "/new";

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-gradient-to-r from-blue-500/15 to-teal-400/15 px-4 py-1.5 text-sm text-text-muted">
              <Sparkles className="h-4 w-4 text-accent" />
              Новое объявление
            </div>
            <h1 className="type-page-title mb-3 text-3xl md:text-5xl">Что выставим на обмен?</h1>
            <p className="mx-auto max-w-2xl text-text-subtle">
              Три коротких шага. Черновик сохранится на этом устройстве, если решите продолжить позже.
            </p>
          </div>

          {userId ? (
            <NewItemForm
              userId={userId}
              returnTo={returnTo}
              continuationTitle={continuation?.title ?? null}
            />
          ) : (
            <EmptyState
              title="Войдите, чтобы создать объявление"
              description="Объявления, фотографии и обмены сохраняются в вашем профиле."
              actionHref={loginHref(currentPath)}
              actionLabel="Войти"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
