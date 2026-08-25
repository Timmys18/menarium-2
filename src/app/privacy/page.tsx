import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/menarium/card";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

const sections = [
  {
    title: "Какие данные обрабатываются",
    text: "Email, имя, город, аватар, объявления, изображения, сообщения в чатах, статусы обменов, уведомления и технические данные безопасности.",
  },
  {
    title: "Зачем нужны данные",
    text: "Для регистрации, входа, публикации объявлений, обменов, сообщений, уведомлений, защиты от злоупотреблений и выполнения требований закона.",
  },
  {
    title: "Хранение и защита",
    text: "Данные хранятся столько, сколько необходимо для работы сервиса, безопасности аккаунтов и исполнения обязательных требований. Доступ ограничен техническими и организационными мерами.",
  },
  {
    title: "Доступ и безопасность",
    text: "Доступ к данным получают только сам пользователь и уполномоченные сотрудники, когда это необходимо для поддержки, безопасности или выполнения требований закона. Передача данных защищается шифрованием.",
  },
  {
    title: "Права пользователя",
    text: "Пользователь может редактировать профиль, управлять объявлениями и запросить удаление или уточнение своих данных.",
  },
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
        <GlassCard className="mx-auto max-w-4xl space-y-5 p-6 sm:p-8">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Политика конфиденциальности</h1>
          <p className="text-white/62">Здесь описано, какие данные использует Менариум и как пользователь может ими управлять.</p>
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-2 text-xl font-semibold">{section.title}</h2>
              <p className="text-white/62">{section.text}</p>
            </section>
          ))}
          <p className="text-sm leading-6 text-white/62">
            По вопросам о персональных данных напишите на{" "}
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
