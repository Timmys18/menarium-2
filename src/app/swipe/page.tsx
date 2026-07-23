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
  const serializedItem = item ? serializeItem(item) : null;
  const card = serializedItem ? toItemCardView(serializedItem) : null;

  return (
    <AppShell>
      <div className="page-enter min-h-screen px-4 pb-52 pt-20 sm:px-6 md:pb-32 md:pt-28">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 text-center md:mb-8">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200/72 md:hidden">
              Быстрый поиск
            </p>
            <h1 className="mb-2 text-3xl font-bold tracking-[-0.04em] md:mb-4 md:text-5xl">
              <span className="gradient-text">Свайп</span> обмена
            </h1>
            <p className="mx-auto max-w-xl text-sm text-white/66 md:text-base">
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
                city: card.city,
                ownerName: serializedItem?.owner?.name ?? "Участник Menarium",
                isOnline: serializedItem?.isOnline ?? false,
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
