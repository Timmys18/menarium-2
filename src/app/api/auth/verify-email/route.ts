import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { consumeAuthToken, createAuthToken, emailVerifyIdentifier } from "@/lib/auth-tokens";
import { sendEmailVerification } from "@/lib/auth-emails";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/product-analytics";
import { requireUserId } from "@/server/session";
import { checkRateLimit } from "@/lib/rate-limit";

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  token: z.string().min(10),
});

export async function POST(req: Request) {
  const body = await parseJson(req);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return errorResponse("Некорректная ссылка подтверждения", 400);

  const { email, token } = parsed.data;
  const consumed = await consumeAuthToken(emailVerifyIdentifier(email), token, (tx) =>
    tx.user.update({
      where: { email },
      data: { emailVerified: new Date() },
      select: { id: true },
    }),
  );
  if (!consumed.ok) return errorResponse("Ссылка недействительна или устарела", 400);

  await trackProductEvent({
    name: "email_verified",
    actorId: consumed.value.id,
    entityType: "User",
    entityId: consumed.value.id,
    dedupeKey: `user:${consumed.value.id}:email-verified`,
  });

  return actionResponse({ verified: true });
}

export async function PUT() {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkRateLimit(`resend-verify:${auth.userId}`, {
    limit: 3,
    windowSec: 60 * 60,
    error: "Слишком много запросов. Попробуйте через час.",
  });
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true, emailVerified: true },
  });
  if (!user) return errorResponse("Пользователь не найден", 404);
  if (user.emailVerified) return actionResponse({ alreadyVerified: true });

  const token = await createAuthToken(emailVerifyIdentifier(user.email), 24);
  const sent = await sendEmailVerification(user.email, token);
  if (!sent) {
    return errorResponse("Сейчас не получилось отправить письмо. Попробуйте ещё раз через несколько минут.", 503);
  }

  return actionResponse({ sent: true });
}
