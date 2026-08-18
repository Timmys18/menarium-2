import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/menarium/card";

const sections = [
  {
    title: "Назначение сервиса",
    text: "Менариум позволяет публиковать объявления о вещах и услугах, предлагать обмен, вести переписку и фиксировать статус сделки.",
  },
  {
    title: "Ответственность пользователей",
    text: "Пользователь отвечает за достоверность объявления, законность предмета или услуги, содержание сообщений и фактическое исполнение договоренности.",
  },
  {
    title: "Обмены и статусы",
    text: "Предложение обмена может быть принято, отклонено, отозвано, отменено или завершено. Завершение подтверждается участниками сделки.",
  },
  {
    title: "Запрещенный контент",
    text: "Запрещены незаконные товары и услуги, мошенничество, персональные данные третьих лиц без согласия, угрозы, спам и материалы, нарушающие права других лиц.",
  },
  {
    title: "Модерация",
    text: "Администрация может архивировать объявления и ограничивать доступ при нарушениях правил, требованиях закона или рисках для пользователей.",
  },
];

export default function TermsPage() {
  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <GlassCard className="mx-auto max-w-4xl space-y-5 p-8">
          <h1 className="text-4xl font-bold">Пользовательское соглашение</h1>
          <p className="text-text-subtle">
            Правила использования сервиса Менариум.
          </p>
          {sections.map((section) => (
            <section key={section.title} className="rounded-control border border-line-default bg-fill-1 p-5">
              <h2 className="mb-2 text-xl font-semibold">{section.title}</h2>
              <p className="text-text-subtle">{section.text}</p>
            </section>
          ))}
          <p className="text-sm text-text-subtle">Перед публичным запуском соглашение должно пройти финальную юридическую вычитку под российскую юрисдикцию.</p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
