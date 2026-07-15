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
  const [item, userItems] = userId
    ? await Promise.all([
        prisma.item.findFirst({
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
        }),
        prisma.item.findMany({
          where: { ownerId: userId, status: ItemStatus.ACTIVE },
          select: { id: true, title: true },
          orderBy: { updatedAt: "desc" },
        }),
      ])
    : [null, []];
  const card = item ? toItemCardView(serializeItem(item)) : null;

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              <span className="gradient-text">Свайп</span> обмена
            </h1>
            <p className="text-white/60">
              Тяни влево — пропустить, вправо — предложить обмен. Или используй кнопки ниже.
            </p>
          </div>

          {!userId ? (
            <EmptyState
              title="Войдите, чтобы открыть свайп"
              description="Свайп-лента персональная: Menarium исключает ваши объявления и уже отправленные предложения."
              actionHref={loginHref("/swipe")}
              actionLabel="Войти"
            />
          ) : card ? (
            <SwipeCardStack
              card={{
                id: card.id,
                title: card.title,
                category: card.category,
                wanted: card.wanted,
                image: card.image,
              }}
              userItems={userItems}
            />
          ) : (
            <EmptyState
              title="Новых карточек пока нет"
              description="Вы уже просмотрели доступные объявления или в каталоге пока мало активных предложений."
              actionHref="/catalog"
              actionLabel="Открыть каталог"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
