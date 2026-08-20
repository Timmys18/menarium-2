import { ItemStatus } from "@prisma/client";
import { notFound } from "next/navigation";
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
  const item = userId
    ? await prisma.item.findFirst({
        where: { id, ownerId: userId },
        include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
      })
    : null;

  if (userId && !item) notFound();
  const publicItem = item ? serializeItem(item) : null;
  const canEdit = item?.status === ItemStatus.ACTIVE || item?.status === ItemStatus.PAUSED;

  return (
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
        ) : canEdit && publicItem ? (
          <EditItemForm item={publicItem} />
        ) : (
          <EmptyState
            title="Объявление нельзя редактировать"
            description="Объявление уже участвует в обмене или сохранено в истории. В этих состояниях данные защищены от изменений."
            actionHref={`/item/${id}`}
            actionLabel="Вернуться к объявлению"
          />
        )}
      </div>
    </div>
  );
}
