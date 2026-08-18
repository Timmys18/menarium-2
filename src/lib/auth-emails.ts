import { appBaseUrl, sendEmail } from "@/lib/email";

export async function sendPasswordResetEmail(email: string, token: string, callbackUrl = "/profile") {
  const search = new URLSearchParams({ token, email, callbackUrl });
  const link = `${appBaseUrl()}/auth/reset-password?${search.toString()}`;
  const sent = await sendEmail({
    to: email,
    subject: "Сброс пароля — Менариум",
    text: `Вы запросили сброс пароля в Менариум.\n\nПерейдите по ссылке (действует 1 час):\n${link}\n\nЕсли вы не запрашивали сброс — просто проигнорируйте это письмо.`,
    html: `<p>Вы запросили сброс пароля в <strong>Менариум</strong>.</p><p><a href="${link}">Сбросить пароль</a></p><p>Ссылка действует 1 час. Если вы не запрашивали сброс — проигнорируйте письмо.</p>`,
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.info(`[dev] Password reset link for ${email}: ${link}`);
  }

  return sent;
}

/**
 * Уходит владельцу адреса, когда кто-то пытается зарегистрироваться на уже
 * занятую почту. Новый аккаунт при этом не создаётся, и ответ API ничем не
 * отличается от обычной регистрации — узнать о занятости адреса можно только
 * из этого письма, то есть только имея доступ к самому ящику.
 */
export async function sendRegistrationAttemptNotice(email: string) {
  const loginLink = `${appBaseUrl()}/auth/login`;
  const resetLink = `${appBaseUrl()}/auth/forgot-password`;
  const sent = await sendEmail({
    to: email,
    subject: "Попытка регистрации — Менариум",
    text: `На этот адрес уже зарегистрирован аккаунт в Менариум, поэтому новый создан не был.\n\nЕсли регистрацию начали вы — просто войдите: ${loginLink}\nЗабыли пароль — восстановите: ${resetLink}\n\nЕсли это были не вы, никаких действий не требуется: доступ к аккаунту не изменился.`,
    html: `<p>На этот адрес уже зарегистрирован аккаунт в <strong>Менариум</strong>, поэтому новый создан не был.</p><p>Если регистрацию начали вы — <a href="${loginLink}">войдите</a>. Забыли пароль — <a href="${resetLink}">восстановите доступ</a>.</p><p>Если это были не вы, никаких действий не требуется: доступ к аккаунту не изменился.</p>`,
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.info(`[dev] Registration attempt on existing account: ${email}`);
  }

  return sent;
}

export async function sendEmailVerification(email: string, token: string) {
  const link = `${appBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const sent = await sendEmail({
    to: email,
    subject: "Подтвердите email — Менариум",
    text: `Добро пожаловать в Менариум!\n\nПодтвердите почту по ссылке (действует 24 часа):\n${link}`,
    html: `<p>Добро пожаловать в <strong>Менариум</strong>!</p><p><a href="${link}">Подтвердить email</a></p><p>Ссылка действует 24 часа.</p>`,
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.info(`[dev] Email verify link for ${email}: ${link}`);
  }

  return sent;
}
