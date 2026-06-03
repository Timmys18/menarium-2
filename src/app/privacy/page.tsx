import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/menarium/card";

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <GlassCard className="mx-auto max-w-4xl space-y-5 p-8">
          <h1 className="text-4xl font-bold">Политика конфиденциальности</h1>
          <p className="text-white/60">
            Menarium проектируется с учетом требований 152-ФЗ: персональные данные хранятся в РФ,
            доступ ограничивается ролями и журналируется в production-контуре.
          </p>
          <p className="text-white/60">
            Финальная юридическая редакция будет утверждена перед публикацией `menarium.ru`.
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
