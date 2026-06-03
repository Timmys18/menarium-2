import { AppShell } from "@/components/layout/app-shell";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { MenariumInput, MenariumTextarea } from "@/components/menarium/input";

type Props = { params: Promise<{ id: string }> };

export default async function EditItemPage({ params }: Props) {
  const { id } = await params;

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold">Редактировать объявление</h1>
          <GlassCard className="space-y-5 p-8">
            <MenariumInput defaultValue={id.startsWith("demo") ? "Sony WH-1000XM5" : ""} placeholder="Название" />
            <MenariumInput placeholder="Категория" />
            <MenariumInput placeholder="Город" />
            <MenariumTextarea placeholder="Описание" />
            <MenariumInput placeholder="Что хотите взамен" />
            <div className="flex gap-3">
              <MenariumButton>Сохранить</MenariumButton>
              <MenariumLinkButton href={`/item/${id}`} variant="secondary">Отмена</MenariumLinkButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
