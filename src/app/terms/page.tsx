import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/menarium/card";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

const sections = [
  {
    title: "Назначение сервиса",
    text: "Менариум позволяет публиковать объявления о вещах и услугах, отправлять предложения обмена, вести переписку и фиксировать статус обмена.",
  },
  {
    title: "Ответственность пользователей",
    text: "Пользователь отвечает за достоверность объявления, законность предмета или услуги, содержание сообщений и фактическое исполнение договоренности.",
  },
  {
    title: "Обмены и статусы",
    text: "Предложение обмена можно принять, отклонить или отозвать. Принятый обмен можно отменить или завершить; завершение подтверждают оба участника.",
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
      <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
        <GlassCard className="mx-auto max-w-4xl space-y-5 p-6 sm:p-8">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Пользовательское соглашение</h1>
          <p className="text-white/62">
            Правила использования сервиса Менариум.
          </p>
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-2 text-xl font-semibold">{section.title}</h2>
              <p className="text-white/62">{section.text}</p>
            </section>
          ))}
          <p className="text-sm leading-6 text-white/62">
            Вопросы о правилах сервиса можно отправить на{" "}
            <a className="rounded text-teal-200 underline decoration-teal-200/35 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70" href={SUPPORT_MAILTO}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
