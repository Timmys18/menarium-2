import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { createAuthToken, passwordResetIdentifier } from "@/lib/auth-tokens";
import { sendPasswordResetEmail } from "@/lib/auth-emails";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeCallbackUrl } from "@/lib/utils";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  callbackUrl: z.string().max(2048).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimit(`forgot-password:${ip}`, {
    limit: 5,
    windowSec: 15 * 60,
    error: "Слишком много запросов. Попробуйте позже.",
  });
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Некорректный email", 400);

  const { email } = parsed.data;
  const callbackUrl = safeCallbackUrl(parsed.data.callbackUrl);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });

  // Всегда одинаковый ответ — защита от перебора существующих email.
  if (user?.passwordHash) {
    const token = await createAuthToken(passwordResetIdentifier(email), 1);
    await sendPasswordResetEmail(email, token, callbackUrl);
  }

  return actionResponse({
    sent: true,
    message: "Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.",
  });
}
