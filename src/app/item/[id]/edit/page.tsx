import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/menarium/empty-state";
import { serializeItem } from "@/features/items/serializers";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";
import { EditItemForm } from "./edit-item-form";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function EditItemPage({ params }: Props) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const item = await prisma.item.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
  });

  if (!item) notFound();
  const publicItem = serializeItem(item);
  const canEdit = Boolean(userId && item.ownerId === userId);

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold">Редактировать объявление</h1>
          {!userId ? (
            <EmptyState
              title="Войдите, чтобы редактировать объявление"
              description="Редактирование доступно только владельцу объявления."
              actionHref="/auth/login"
              actionLabel="Войти"
            />
          ) : canEdit ? (
            <EditItemForm item={publicItem} />
          ) : (
            <EmptyState
              title="Это не ваше объявление"
              description="Вы можете редактировать только объявления, созданные вашим профилем."
              actionHref={`/item/${id}`}
              actionLabel="Вернуться к объявлению"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
