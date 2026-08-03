import bcrypt from "bcryptjs";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { createAuthToken, emailVerifyIdentifier } from "@/lib/auth-tokens";
import { sendEmailVerification } from "@/lib/auth-emails";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordHasDigit,
  passwordHasLetter,
} from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/product-analytics";
import { checkRegisterRateLimit, getClientIp } from "@/lib/rate-limit";
import { isPrismaError } from "@/lib/transactions";
import { getCity } from "@/features/locations/cities";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Имя слишком короткое").max(80).optional().or(z.literal("")),
  cityId: z.string().trim().max(180).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
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
  const rate = await checkRegisterRateLimit(ip);
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Некорректные данные", 400);
  }

  const { email, password, name, cityId } = parsed.data;
  const city = cityId ? getCity(cityId) : null;
  if (cityId && !city) return errorResponse("Выберите город из списка.", 400);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return errorResponse("Пользователь с таким email уже существует", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        city: city?.name ?? null,
        cityId: city?.id ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        city: true,
        cityId: true,
      },
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return errorResponse("Пользователь с таким email уже существует", 409);
    }
    throw error;
  }

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
