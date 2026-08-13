import { NotificationType, SwapStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { trackProductEvent } from "@/lib/product-analytics";
import { publishUserEvents } from "@/lib/realtime";
import { isPrismaError, runSerializableTransaction } from "@/lib/transactions";
import { createNotification } from "@/features/notifications/create-notification";
import { getInitialReviewVisibleAt } from "@/features/reviews/policy";
import { createReviewSchema } from "@/features/reviews/validation";
import { requireUserId } from "@/server/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ swapId: string }> },
) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "review:create");
  if (!rate.ok) {
    return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });
  }

  const body = await parseJson(request);
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Поставьте оценку от 1 до 5 и сократите текст до 600 символов", 400);

  const { swapId } = await params;
  const now = new Date();

  try {
    const result = await runSerializableTransaction(async (tx) => {
      const swap = await tx.swapRequest.findUnique({
        where: { id: swapId },
        select: {
          id: true,
          status: true,
          senderId: true,
          receiverId: true,
          completedAt: true,
        },
      });

      if (!swap) throw new Error("SWAP_NOT_FOUND");
      if (swap.senderId !== auth.userId && swap.receiverId !== auth.userId) {
        throw new Error("FORBIDDEN");
      }
      if (swap.status !== SwapStatus.COMPLETED || !swap.completedAt) {
        throw new Error("SWAP_NOT_COMPLETED");
      }

      const revieweeId = swap.senderId === auth.userId ? swap.receiverId : swap.senderId;
      const existingReviews = await tx.review.findMany({
        where: { swapId },
        select: { id: true, reviewerId: true, revieweeId: true, visibleAt: true },
      });
      const initialVisibleAt = getInitialReviewVisibleAt(swap.completedAt);
      const created = await tx.review.create({
        data: {
          swapId,
          reviewerId: auth.userId,
          revieweeId,
          rating: parsed.data.rating,
          comment: parsed.data.comment,
          visibleAt: initialVisibleAt,
        },
        select: { id: true, reviewerId: true, revieweeId: true, visibleAt: true },
      });

      const allReviews = [...existingReviews, created];
      let newlyPublished = initialVisibleAt <= now ? [created] : [];

      if (allReviews.length >= 2) {
        newlyPublished = allReviews.filter(
          (review) => review.id === created.id || review.visibleAt > now,
        );
        await tx.review.updateMany({ where: { swapId }, data: { visibleAt: now } });
      }

      for (const review of newlyPublished) {
        await createNotification(tx, {
          userId: review.revieweeId,
          type: NotificationType.REVIEW_PUBLISHED,
          title: "Опубликован отзыв об обмене",
          message: "Партнёр оставил подтверждённый отзыв после завершённого обмена.",
          href: `/exchange?tab=matches&filter=history&swap=${swapId}`,
          entityType: "Review",
          entityId: review.id,
        });
      }

      const review = await tx.review.findUniqueOrThrow({
        where: { id: created.id },
        select: {
          id: true,
          rating: true,
          comment: true,
          visibleAt: true,
          createdAt: true,
        },
      });

      return {
        review,
        notificationUserIds: newlyPublished.map((entry) => entry.revieweeId),
      };
    });

    if (result.notificationUserIds.length > 0) {
      await publishUserEvents(result.notificationUserIds, {
        type: "notification",
        entityId: swapId,
      });
      for (const userId of result.notificationUserIds) {
        revalidatePath(`/user/${userId}`);
      }
    }
    await trackProductEvent({
      name: "review_submitted",
      actorId: auth.userId,
      entityType: "SwapRequest",
      entityId: swapId,
      dedupeKey: `swap:${swapId}:review:${auth.userId}`,
      properties: { rating: result.review.rating },
    });

    return actionResponse({
      ...result.review,
      isVisible: result.review.visibleAt <= new Date(),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SWAP_NOT_FOUND") return errorResponse("Обмен не найден", 404);
      if (error.message === "FORBIDDEN") return errorResponse("Отзыв доступен только участникам обмена", 403);
      if (error.message === "SWAP_NOT_COMPLETED") return errorResponse("Отзыв можно оставить после завершения обмена", 409);
    }
    if (isPrismaError(error, "P2002")) return errorResponse("Вы уже оставили отзыв об этом обмене", 409);
    if (isPrismaError(error, "P2034")) return errorResponse("Данные обновились. Отправьте отзыв ещё раз", 409);
    return errorResponse("Не удалось сохранить отзыв", 500);
  }
}
