import bcrypt from "bcryptjs";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { createAuthToken, emailVerifyIdentifier } from "@/lib/auth-tokens";
import { sendEmailVerification } from "@/lib/auth-emails";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/product-analytics";
import { checkRegisterRateLimit, getClientIp } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Имя слишком короткое").max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
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
  const rate = await checkRegisterRateLimit(ip);
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Некорректные данные", 400);
  }

  const { email, password, name, city } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return errorResponse("Пользователь с таким email уже существует", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name || null,
      city: city || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      city: true,
    },
  });

  const verifyToken = await createAuthToken(emailVerifyIdentifier(email), 24);
  const verifyEmailSent = await sendEmailVerification(email, verifyToken);
  await trackProductEvent({
    name: "user_registered",
    actorId: user.id,
    entityType: "User",
    entityId: user.id,
    dedupeKey: `user:${user.id}:registered`,
  });

  return actionResponse(user, { verifyEmailSent }, 201);
}
