import bcrypt from "bcryptjs";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { createAuthToken, emailVerifyIdentifier } from "@/lib/auth-tokens";
import { sendEmailVerification, sendRegistrationAttemptNotice } from "@/lib/auth-emails";
import { PASSWORD_MAX_LENGTH, checkPassword, describePasswordRejection } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/product-analytics";
import { checkRegisterRateLimit, getClientIp } from "@/lib/rate-limit";
import { isPrismaError } from "@/lib/transactions";
import { getCity } from "@/features/locations/cities";
import { reportError } from "@/lib/logger";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Имя слишком короткое").max(80).optional().or(z.literal("")),
  cityId: z.string().trim().max(180).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  password: z.string().max(PASSWORD_MAX_LENGTH),
});

/**
 * Ответ на регистрацию не должен зависеть от того, занят email или нет.
 * Прежняя версия отвечала 409 «Пользователь с таким email уже существует» —
 * это готовый оракул: по списку адресов можно было выяснить, кто зарегистрирован
 * на площадке. Теперь оба пути возвращают одно и то же тело и один и тот же код.
 */
function neutralResponse(email: string, verifyEmailSent: boolean) {
  return actionResponse({ email }, { verifyEmailSent }, 201);
}

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
  const passwordRejection = checkPassword(password, { email, name });
  if (passwordRejection) return errorResponse(describePasswordRejection(passwordRejection), 400);

  const city = cityId ? getCity(cityId) : null;
  if (cityId && !city) return errorResponse("Выберите город из списка.", 400);

  // Хэшируем всегда, даже когда аккаунт уже существует: bcrypt на 12 раундах
  // занимает заметное время, и пропуск этого шага сам по себе стал бы
  // измеримым признаком «такой email уже занят».
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // Владельцу адреса сообщаем о попытке — он узнает и о чужом интересе к
    // своему аккаунту, и о том, как войти, если попытка была его собственной.
    const sent = await sendRegistrationAttemptNotice(email).catch((error) => {
      reportError("auth.registration_notice_failed", error);
      return false;
    });
    return neutralResponse(email, sent);
  }

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
      select: { id: true, email: true },
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      // Гонка двух одновременных регистраций на один адрес: ответ обязан
      // остаться тем же, иначе оракул возвращается через тайминг.
      const sent = await sendRegistrationAttemptNotice(email).catch(() => false);
      return neutralResponse(email, sent);
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

  return neutralResponse(user.email, verifyEmailSent);
}
