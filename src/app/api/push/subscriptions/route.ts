import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { isWebPushConfigured } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { requireUserId } from "@/server/session";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4096),
  keys: z.object({
    p256dh: z.string().min(1).max(4096),
    auth: z.string().min(1).max(4096),
  }),
});

export async function GET() {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  return actionResponse({
    configured: isWebPushConfigured(),
    publicKey: isWebPushConfigured()
      ? process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.trim()
      : null,
  });
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;
  if (!isWebPushConfigured()) return errorResponse("Браузерные уведомления пока не настроены", 503);

  const rate = await checkActionRateLimit(auth.userId, "push:subscribe");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const parsed = subscriptionSchema.safeParse(await parseJson(req));
  if (!parsed.success) return errorResponse("Некорректные данные подписки", 400);

  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      userId: auth.userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    update: {
      userId: auth.userId,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    select: { id: true },
  });

  return actionResponse({ subscribed: true, id: subscription.id }, {}, 201);
}

export async function DELETE(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const body = await parseJson<{ endpoint?: string }>(req);
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint) return errorResponse("Не найдена подписка браузера", 400);

  await prisma.pushSubscription.deleteMany({
    where: { userId: auth.userId, endpoint },
  });
  return actionResponse({ subscribed: false });
}
