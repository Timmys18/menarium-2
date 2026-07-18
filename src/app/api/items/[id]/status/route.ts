import { SwapStatus } from "@prisma/client";
import { z } from "zod";
import { getItemLifecycleTransition } from "@/features/items/lifecycle";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { runSerializableTransaction } from "@/lib/transactions";
import { requireUserId } from "@/server/session";
import { reportError } from "@/lib/logger";

type Context = { params: Promise<{ id: string }> };

const itemLifecycleSchema = z
  .object({ action: z.enum(["pause", "resume"]) })
  .strict();

const failureMessages = {
  HAS_ACTIVE_SWAP: "Сначала ответьте на активные предложения или завершите текущий обмен",
  NOT_ACTIVE: "Приостановить можно только опубликованное объявление",
  NOT_PAUSED: "Вернуть в каталог можно только объявление на паузе",
} as const;

export async function PATCH(request: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const body = await parseJson(request);
  const parsed = itemLifecycleSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Неизвестное действие с объявлением", 400);

  const rate = await checkActionRateLimit(auth.userId, `items:${parsed.data.action}`);
  if (!rate.ok) {
    return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });
  }

  const { id } = await context.params;

  try {
    const result = await runSerializableTransaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id },
        select: { id: true, ownerId: true, status: true },
      });
      if (!item) throw new Error("ITEM_NOT_FOUND");
      if (item.ownerId !== auth.userId) throw new Error("ITEM_FORBIDDEN");

      const activeSwapCount =
        parsed.data.action === "pause"
          ? await tx.swapRequest.count({
              where: {
                status: { in: [SwapStatus.PENDING, SwapStatus.ACCEPTED] },
                OR: [{ senderItemId: id }, { receiverItemId: id }],
              },
            })
          : 0;
      const transition = getItemLifecycleTransition({
        status: item.status,
        action: parsed.data.action,
        hasActiveSwap: activeSwapCount > 0,
      });
      if (!transition.ok) throw new Error(`ITEM_LIFECYCLE_${transition.reason}`);

      const updated = await tx.item.updateMany({
        where: { id, ownerId: auth.userId, status: item.status },
        data: { status: transition.nextStatus },
      });
      if (updated.count !== 1) throw new Error("ITEM_CHANGED");

      return { id, status: transition.nextStatus };
    });

    return actionResponse(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ITEM_NOT_FOUND") return errorResponse("Объявление не найдено", 404);
      if (error.message === "ITEM_FORBIDDEN") {
        return errorResponse("Вы не можете управлять чужим объявлением", 403);
      }
      if (error.message === "ITEM_CHANGED") {
        return errorResponse("Состояние объявления изменилось. Обновите страницу", 409);
      }
      const lifecycleFailure = error.message.replace("ITEM_LIFECYCLE_", "") as keyof typeof failureMessages;
      if (lifecycleFailure in failureMessages) {
        return errorResponse(failureMessages[lifecycleFailure], 409);
      }
    }

    reportError("item.lifecycle_update_failed", error);
    return errorResponse("Не удалось изменить состояние объявления", 500);
  }
}
