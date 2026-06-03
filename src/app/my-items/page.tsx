import { AppShell } from "@/components/layout/app-shell";
import { MenariumLinkButton } from "@/components/menarium/button";
import { ItemCard } from "@/components/menarium/item-card";
import { sampleItems } from "@/features/items/sample-data";

export default function MyItemsPage() {
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sampleItems.slice(0, 3).map((item) => (
              <ItemCard key={item.id} {...item} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
