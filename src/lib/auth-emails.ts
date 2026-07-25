import { appBaseUrl, sendEmail } from "@/lib/email";

export async function sendPasswordResetEmail(email: string, token: string, callbackUrl = "/profile") {
  const search = new URLSearchParams({ token, email, callbackUrl });
  const link = `${appBaseUrl()}/auth/reset-password?${search.toString()}`;
  const sent = await sendEmail({
    to: email,
    subject: "Сброс пароля — Menarium",
    text: `Вы запросили сброс пароля на Menarium.\n\nПерейдите по ссылке (действует 1 час):\n${link}\n\nЕсли вы не запрашивали сброс — просто проигнорируйте это письмо.`,
    html: `<p>Вы запросили сброс пароля на <strong>Menarium</strong>.</p><p><a href="${link}">Сбросить пароль</a></p><p>Ссылка действует 1 час. Если вы не запрашивали сброс — проигнорируйте письмо.</p>`,
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.info(`[dev] Password reset link for ${email}: ${link}`);
  }

  return sent;
}

export async function sendEmailVerification(email: string, token: string) {
  const link = `${appBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const sent = await sendEmail({
    to: email,
    subject: "Подтвердите email — Menarium",
    text: `Добро пожаловать в Menarium!\n\nПодтвердите почту по ссылке (действует 24 часа):\n${link}`,
    html: `<p>Добро пожаловать в <strong>Menarium</strong>!</p><p><a href="${link}">Подтвердить email</a></p><p>Ссылка действует 24 часа.</p>`,
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.info(`[dev] Email verify link for ${email}: ${link}`);
  }

  return sent;
}
