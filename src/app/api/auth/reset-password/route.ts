import bcrypt from "bcryptjs";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { consumeAuthToken, passwordResetIdentifier } from "@/lib/auth-tokens";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().min(10),
  password: z
    .string()
    .min(8, "Пароль должен быть не короче 8 символов")
    .max(128)
    .refine((value) => /[a-zA-Zа-яА-Я]/.test(value) && /\d/.test(value), {
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
  const valid = await consumeAuthToken(passwordResetIdentifier(email), token);
  if (!valid) return errorResponse("Ссылка недействительна или устарела", 400);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return errorResponse("Пользователь не найден", 404);

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return actionResponse({ reset: true });
}
