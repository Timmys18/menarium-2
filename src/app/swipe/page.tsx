import { ItemStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/menarium/empty-state";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { prisma } from "@/lib/prisma";
import { getSwipeExclusions } from "@/features/items/swipe-exclusions";
import { loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { SwipeCardStack } from "./swipe-card-stack";

export const dynamic = "force-dynamic";

export default async function SwipePage() {
  const userId = await getCurrentUserId();
  const exclusions = userId ? await getSwipeExclusions(userId) : { itemIds: [], ownerIds: [] };
  const [items, userItems] = userId
    ? await Promise.all([
        prisma.item.findMany({
          where: {
            status: ItemStatus.ACTIVE,
            ownerId: {
              not: userId,
              ...(exclusions.ownerIds.length ? { notIn: exclusions.ownerIds } : {}),
            },
            ...(exclusions.itemIds.length ? { id: { notIn: exclusions.itemIds } } : {}),
          },
          include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        prisma.item.findMany({
          where: { ownerId: userId, status: ItemStatus.ACTIVE },
          select: { id: true, title: true },
          orderBy: { updatedAt: "desc" },
        }),
      ])
    : [[], []];
  const cards = items.map((item) => {
    const serializedItem = serializeItem(item);
    const card = toItemCardView(serializedItem);
    return {
      id: card.id,
      title: card.title,
      category: card.category,
      wanted: card.wanted,
      image: card.image,
      city: card.city,
      ownerName: serializedItem.owner?.name ?? "Участник Менариум",
      isOnline: serializedItem.isOnline,
    };
  });

  return (
    <AppShell>
      <div className="page-enter min-h-screen px-4 pb-52 pt-20 sm:px-6 md:pb-32 md:pt-28">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 text-center md:mb-8">
            <h1 className="type-page-title text-3xl md:text-5xl">Свайп обмена</h1>
          </div>

          {!userId ? (
            <EmptyState
              title="Войдите, чтобы открыть свайп"
              description="Здесь не показываются ваши объявления и варианты, которые вы уже просмотрели."
              actionHref={loginHref("/swipe")}
              actionLabel="Войти"
            />
          ) : cards.length > 0 ? (
            <SwipeCardStack
              cards={cards}
              userItems={userItems}
            />
          ) : (
            <EmptyState
              title="Новых карточек пока нет"
              description="Вы уже просмотрели доступные объявления или в каталоге пока мало новых вариантов."
              actionHref="/catalog"
              actionLabel="Открыть каталог"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
