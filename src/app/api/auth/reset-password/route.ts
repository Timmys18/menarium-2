import bcrypt from "bcryptjs";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { consumeAuthToken, passwordResetIdentifier } from "@/lib/auth-tokens";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordHasDigit,
  passwordHasLetter,
} from "@/lib/password-policy";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { invalidateUserSessionState } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().min(10),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов`)
    .max(PASSWORD_MAX_LENGTH)
    .refine((value) => passwordHasLetter(value) && passwordHasDigit(value), {
      message: "Пароль должен содержать буквы и цифры",
    }),
});

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimit(`reset-password:${ip}`, {
    limit: 10,
    windowSec: 15 * 60,
    error: "Слишком много попыток. Попробуйте позже.",
  });
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Некорректные данные", 400);

  const { email, token, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);
  const consumed = await consumeAuthToken(passwordResetIdentifier(email), token, (tx) =>
    tx.user.update({
      where: { email },
      data: { passwordHash, sessionVersion: { increment: 1 } },
      select: { id: true },
    }),
  );
  if (!consumed.ok) return errorResponse("Ссылка недействительна или устарела", 400);
  await invalidateUserSessionState(consumed.value.id);

  return actionResponse({ reset: true });
}
