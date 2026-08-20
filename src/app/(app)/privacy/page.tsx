import { GlassCard } from "@/components/menarium/card";

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
    title: "Хранение и инфраструктура",
    text: "Персональные данные размещаются в Российской Федерации или в иной юридически допустимой инфраструктуре.",
  },
  {
    title: "Доступ и безопасность",
    text: "Доступ к данным ограничивается аккаунтом пользователя, серверными проверками прав, rate limiting, админ-доступом через allowlist и HTTPS в production.",
  },
  {
    title: "Права пользователя",
    text: "Пользователь может редактировать профиль, управлять объявлениями и запросить удаление или уточнение данных через канал поддержки, который будет опубликован перед запуском.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
      <GlassCard className="mx-auto max-w-4xl space-y-5 p-8">
        <h1 className="text-4xl font-bold">Политика конфиденциальности</h1>
        <p className="text-text-subtle">
          Менариум учитывает требования 152-ФЗ к обработке персональных данных.
          Эта редакция описывает базовую модель обработки данных для запуска сервиса.
        </p>
        {sections.map((section) => (
          <section key={section.title} className="rounded-control border border-line-default bg-fill-1 p-5">
            <h2 className="mb-2 text-xl font-semibold">{section.title}</h2>
            <p className="text-text-subtle">{section.text}</p>
          </section>
        ))}
        <p className="text-sm text-text-subtle">Финальная юридическая редакция должна быть утверждена перед публичным запуском `menarium.ru`.</p>
      </GlassCard>
    </div>
  );
}
