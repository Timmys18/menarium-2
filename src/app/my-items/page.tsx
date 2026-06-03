import { AppShell } from "@/components/layout/app-shell";
import { MenariumLinkButton } from "@/components/menarium/button";
import { EmptyState } from "@/components/menarium/empty-state";
import { ItemCard } from "@/components/menarium/item-card";
import { serializeItem } from "@/features/items/serializers";
import { toItemCardView } from "@/features/items/presenters";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function MyItemsPage() {
  const userId = await getCurrentUserId();
  const items = userId
    ? await prisma.item.findMany({
        where: { ownerId: userId },
        include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];
  const cards = items.map((item) => toItemCardView(serializeItem(item)));

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Мои объявления</h1>
              <p className="mt-2 text-white/60">Управляй тем, что готов обменять.</p>
            </div>
            <MenariumLinkButton href="/new">Создать</MenariumLinkButton>
          </div>
          {!userId ? (
            <EmptyState
              title="Войдите, чтобы управлять объявлениями"
              description="После входа здесь появятся ваши предметы и услуги для обмена."
              actionHref="/auth/login"
              actionLabel="Войти"
            />
          ) : cards.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((item) => (
                <ItemCard key={item.id} {...item} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="У вас пока нет объявлений"
              description="Создайте первое объявление, чтобы начать обмениваться с другими пользователями."
              actionHref="/new"
              actionLabel="Создать объявление"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
