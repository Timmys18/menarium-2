import { actionResponse, errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUserId } from "@/server/session";

export async function DELETE() {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkRateLimit(`item-views-clear:${auth.userId}`, {
    limit: 5,
    windowSec: 60,
    error: "Подождите минуту и попробуйте снова.",
  });
  if (!rate.ok) {
    return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });
  }

  const result = await prisma.itemView.deleteMany({ where: { userId: auth.userId } });
  return actionResponse({ cleared: result.count });
}
