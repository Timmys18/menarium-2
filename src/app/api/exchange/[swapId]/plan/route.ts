import { NotificationType, SwapStatus } from "@prisma/client";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { trackProductEvent } from "@/lib/product-analytics";
import { publishUserEvents } from "@/lib/realtime";
import { isPrismaError, runSerializableTransaction } from "@/lib/transactions";
import { handoffActionSchema, isHandoffScheduleAllowed } from "@/features/exchange/handoff";
import { createNotification } from "@/features/notifications/create-notification";
import { requireUserId } from "@/server/session";

const handoffSelect = {
  handoffMode: true,
  handoffScheduledAt: true,
  handoffDetails: true,
  handoffRevision: true,
  senderHandoffConfirmed: true,
  receiverHandoffConfirmed: true,
} as const;

function serializeHandoffPlan(plan: {
  handoffMode: "IN_PERSON" | "DELIVERY" | "ONLINE" | null;
  handoffScheduledAt: Date | null;
  handoffDetails: string | null;
  handoffRevision: number;
  senderHandoffConfirmed: boolean;
  receiverHandoffConfirmed: boolean;
}) {
  return {
    ...plan,
    handoffScheduledAt: plan.handoffScheduledAt?.toISOString() ?? null,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ swapId: string }> },
) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const body = await parseJson(request);
  const parsed = handoffActionSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Заполните способ, дату и детали передачи", 400);

  const rate = await checkActionRateLimit(auth.userId, `handoff:${parsed.data.action}`);
  if (!rate.ok) {
    return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });
  }

  const { swapId } = await params;
  if (parsed.data.action === "save") {
    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (!isHandoffScheduleAllowed(scheduledAt)) {
      return errorResponse("Выберите время от текущего момента до ближайших шести месяцев", 400);
    }
  }

  try {
    const result = await runSerializableTransaction(async (tx) => {
      const swap = await tx.swapRequest.findUnique({
        where: { id: swapId },
        select: {
          id: true,
          status: true,
          senderId: true,
          receiverId: true,
          handoffMode: true,
        },
      });
      if (!swap) throw new Error("SWAP_NOT_FOUND");

      const isSender = swap.senderId === auth.userId;
      const isReceiver = swap.receiverId === auth.userId;
      if (!isSender && !isReceiver) throw new Error("FORBIDDEN");
      if (swap.status !== SwapStatus.ACCEPTED) throw new Error("SWAP_NOT_ACCEPTED");
      if (parsed.data.action === "confirm" && !swap.handoffMode) {
        throw new Error("PLAN_REQUIRED");
      }

      const update = await tx.swapRequest.updateMany({
        where: {
          id: swapId,
          status: SwapStatus.ACCEPTED,
          handoffRevision: parsed.data.revision,
        },
        data:
          parsed.data.action === "save"
            ? {
                handoffMode: parsed.data.mode,
                handoffScheduledAt: new Date(parsed.data.scheduledAt),
                handoffDetails: parsed.data.details,
                handoffRevision: { increment: 1 },
                senderHandoffConfirmed: isSender,
                receiverHandoffConfirmed: isReceiver,
                senderCompleted: false,
                receiverCompleted: false,
              }
            : {
                handoffRevision: { increment: 1 },
                ...(isSender
                  ? { senderHandoffConfirmed: true }
                  : { receiverHandoffConfirmed: true }),
              },
      });
      if (update.count !== 1) throw new Error("PLAN_CHANGED");

      const plan = await tx.swapRequest.findUniqueOrThrow({
        where: { id: swapId },
        select: handoffSelect,
      });
      const partnerId = isSender ? swap.receiverId : swap.senderId;
      await createNotification(tx, {
        userId: partnerId,
        type: NotificationType.HANDOFF_UPDATED,
        title: parsed.data.action === "save" ? "Обновлена передача вещей" : "Партнёр подтвердил передачу",
        message:
          parsed.data.action === "save"
            ? "Проверьте способ, дату и детали, затем подтвердите договорённость."
            : "Партнёр подтвердил план передачи по активному обмену.",
        href: `/exchange?tab=matches&swap=${swapId}`,
        entityType: "SwapRequest",
        entityId: swapId,
      });

      return { plan, partnerId };
    });

    await publishUserEvents([auth.userId, result.partnerId], {
      type: "swap",
      entityId: swapId,
    });
    await publishUserEvents([result.partnerId], {
      type: "notification",
      entityId: swapId,
    });
    await trackProductEvent({
      name: parsed.data.action === "save" ? "handoff_plan_saved" : "handoff_plan_confirmed",
      actorId: auth.userId,
      entityType: "SwapRequest",
      entityId: swapId,
      properties: parsed.data.action === "save" ? { mode: parsed.data.mode } : undefined,
    });

    return actionResponse(serializeHandoffPlan(result.plan));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SWAP_NOT_FOUND") return errorResponse("Обмен не найден", 404);
      if (error.message === "FORBIDDEN") return errorResponse("Договорённость доступна только участникам обмена", 403);
      if (error.message === "SWAP_NOT_ACCEPTED") return errorResponse("Передачу можно согласовать после принятия обмена", 409);
      if (error.message === "PLAN_REQUIRED") return errorResponse("Сначала заполните план передачи", 409);
      if (error.message === "PLAN_CHANGED") return errorResponse("Партнёр уже обновил план. Обновите страницу", 409);
    }
    if (isPrismaError(error, "P2034")) return errorResponse("План изменился параллельно. Повторите действие", 409);
    return errorResponse("Не удалось сохранить договорённость", 500);
  }
}
