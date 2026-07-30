import { ChatKind } from "@prisma/client";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { requireUserId } from "@/server/session";

const preferenceSchema = z.object({
  kind: z.enum([ChatKind.DEAL, ChatKind.ITEM]),
  entityId: z.string().min(1).max(128),
  muted: z.boolean(),
});

async function canAccessChat(userId: string, kind: ChatKind, entityId: string) {
  if (kind === ChatKind.DEAL) {
    return Boolean(
      await prisma.swapRequest.findFirst({
        where: { id: entityId, OR: [{ senderId: userId }, { receiverId: userId }] },
        select: { id: true },
      }),
    );
  }

  return Boolean(
    await prisma.itemThread.findFirst({
      where: { id: entityId, OR: [{ buyerId: userId }, { ownerId: userId }] },
      select: { id: true },
    }),
  );
}

export async function GET(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = preferenceSchema.omit({ muted: true }).safeParse({
    kind: url.searchParams.get("kind"),
    entityId: url.searchParams.get("entityId"),
  });
  if (!parsed.success) return errorResponse("Некорректный чат", 400);
  if (!(await canAccessChat(auth.userId, parsed.data.kind, parsed.data.entityId))) {
    return errorResponse("Нет доступа к этому чату", 403);
  }

  const preference = await prisma.chatPreference.findUnique({
    where: {
      userId_kind_entityId: {
        userId: auth.userId,
        kind: parsed.data.kind,
        entityId: parsed.data.entityId,
      },
    },
    select: { muted: true },
  });
  return actionResponse({ muted: preference?.muted ?? false });
}

export async function PATCH(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const parsed = preferenceSchema.safeParse(await parseJson(req));
  if (!parsed.success) return errorResponse("Некорректные настройки чата", 400);
  if (!(await canAccessChat(auth.userId, parsed.data.kind, parsed.data.entityId))) {
    return errorResponse("Нет доступа к этому чату", 403);
  }

  const rate = await checkActionRateLimit(auth.userId, "chat:preference");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const preference = await prisma.chatPreference.upsert({
    where: {
      userId_kind_entityId: {
        userId: auth.userId,
        kind: parsed.data.kind,
        entityId: parsed.data.entityId,
      },
    },
    create: { userId: auth.userId, ...parsed.data },
    update: { muted: parsed.data.muted },
    select: { muted: true },
  });
  return actionResponse(preference);
}
