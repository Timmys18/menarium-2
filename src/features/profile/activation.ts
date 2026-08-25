export type ActivationStepId = "verify" | "profile" | "listing" | "proposal" | "completed";

export type ActivationStep = {
  id: ActivationStepId;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

export type ProfileNextAction = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  label: string;
  kind: "progress" | "urgent" | "complete";
};

export type ProfileActivation = {
  steps: ActivationStep[];
  completedCount: number;
  progress: number;
  complete: boolean;
  nextStep: ActivationStep | null;
  nextAction: ProfileNextAction;
};

export type ProfileActivationInput = {
  emailVerified: boolean;
  hasProfileBasics: boolean;
  activeItems: number;
  pausedItems?: number;
  sentProposals: number;
  outgoingPending: number;
  completedSwaps: number;
  incomingPending: number;
  acceptedSwaps: number;
};

function actionForStep(step: ActivationStep, outgoingPending: number): ProfileNextAction {
  switch (step.id) {
    case "verify":
      return {
        eyebrow: "Аккаунт",
        title: "Подтвердите почту",
        description: "Так важные сообщения об обменах не потеряются, а аккаунт будет лучше защищён.",
        href: step.href,
        label: "Подтвердить почту",
        kind: "progress",
      };
    case "profile":
      return {
        eyebrow: "Профиль",
        title: "Расскажите о себе",
        description: "Имя и город помогают другим участникам быстрее решиться на обмен.",
        href: step.href,
        label: "Заполнить профиль",
        kind: "progress",
      };
    case "listing":
      return {
        eyebrow: "Объявление",
        title: "Добавьте вещь или услугу",
        description: "Укажите, что предлагаете и что хотите получить.",
        href: step.href,
        label: "Создать объявление",
        kind: "progress",
      };
    case "proposal":
      return {
        eyebrow: "Обмен",
        title: "Найдите подходящий обмен",
        description: "Выберите объявление другого участника и отправьте предложение обмена.",
        href: step.href,
        label: "Открыть свайп",
        kind: "progress",
      };
    case "completed":
      return {
        eyebrow: "Обмен",
        title: outgoingPending > 0 ? "Следите за ответом" : "Попробуйте ещё один вариант",
        description:
          outgoingPending > 0
            ? "Мы покажем ответ сразу, как только второй участник примет решение."
            : "Предыдущий вариант не сложился. В свайпе уже могут быть новые подходящие объявления.",
        href: step.href,
        label: outgoingPending > 0 ? "Открыть обмены" : "Найти другой вариант",
        kind: "progress",
      };
  }
}

export function buildProfileActivation(input: ProfileActivationInput): ProfileActivation {
  const pausedItems = input.pausedItems ?? 0;
  const hasExchangeActivity =
    input.sentProposals > 0 ||
    input.outgoingPending > 0 ||
    input.incomingPending > 0 ||
    input.acceptedSwaps > 0 ||
    input.completedSwaps > 0;

  const steps: ActivationStep[] = [
    {
      id: "verify",
      label: "Подтвердить почту",
      description: "Защитить аккаунт и получать важные письма",
      href: "#verify-email",
      done: input.emailVerified,
    },
    {
      id: "profile",
      label: "Заполнить профиль",
      description: "Добавить имя и город",
      href: "/profile/edit",
      done: input.hasProfileBasics,
    },
    {
      id: "listing",
      label: "Создать объявление",
      description: "Опубликовать вещь, навык или услугу",
      href: "/new",
      done: input.activeItems > 0 || pausedItems > 0 || hasExchangeActivity,
    },
    {
      id: "proposal",
      label: "Начать обмен",
      description: "Предложить вариант или ответить другому участнику",
      href: "/swipe",
      done: hasExchangeActivity,
    },
    {
      id: "completed",
      label: "Завершить первый обмен",
      description: "Обе стороны подтвердили результат",
      href: input.outgoingPending > 0 ? "/exchange?tab=outgoing" : "/swipe",
      done: input.completedSwaps > 0,
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) ?? null;
  const complete = completedCount === steps.length;

  let nextAction: ProfileNextAction;
  if (input.incomingPending > 0) {
    nextAction = {
      eyebrow: "Новые предложения",
      title: input.incomingPending === 1 ? "Вам предложили обмен" : `Новых предложений: ${input.incomingPending}`,
      description: "Посмотрите, что предлагают, и ответьте человеку, пока обмен актуален.",
      href: "/exchange?tab=incoming",
      label: "Посмотреть предложение",
      kind: "urgent",
    };
  } else if (input.acceptedSwaps > 0) {
    nextAction = {
      eyebrow: "Активный обмен",
      title: input.acceptedSwaps === 1 ? "Продолжите договорённость" : `Активных обменов: ${input.acceptedSwaps}`,
      description: "Уточните детали в чате и подтвердите результат, когда обе стороны всё выполнили.",
      href: "/exchange?tab=matches",
      label: "Продолжить обмен",
      kind: "urgent",
    };
  } else if (input.activeItems === 0 && pausedItems > 0) {
    nextAction = {
      eyebrow: "Объявления",
      title: pausedItems === 1 ? "Верните объявление в каталог" : `На паузе: ${pausedItems}`,
      description: "Данные и фотографии сохранены. Возобновите публикацию, чтобы снова получать предложения.",
      href: "/profile?status=paused",
      label: "Открыть объявления на паузе",
      kind: "progress",
    };
  } else if (nextStep) {
    nextAction = actionForStep(nextStep, input.outgoingPending);
  } else {
    nextAction = {
      eyebrow: "Обмен завершён",
      title: "Найдите новый вариант",
      description: "Откройте свайп или каталог.",
      href: "/swipe",
      label: "Найти новый обмен",
      kind: "complete",
    };
  }

  return {
    steps,
    completedCount,
    progress: Math.round((completedCount / steps.length) * 100),
    complete,
    nextStep,
    nextAction,
  };
}
