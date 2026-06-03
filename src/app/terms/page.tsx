import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/menarium/card";

export default function TermsPage() {
  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <GlassCard className="mx-auto max-w-4xl space-y-5 p-8">
          <h1 className="text-4xl font-bold">Пользовательское соглашение</h1>
          <p className="text-white/60">
            Menarium помогает пользователям договариваться об обмене вещей и услуг. Стороны самостоятельно
            подтверждают завершение сделки, а платформа фиксирует статусы, чаты и уведомления.
          </p>
          <p className="text-white/60">
            Перед запуском соглашение пройдет юридическую вычитку под российскую юрисдикцию.
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
