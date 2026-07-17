import { SwapStatus, type PrismaClient } from "@prisma/client";

export const SWAP_OFFER_LIFETIME_DAYS = 7;

export function getSwapOfferExpiresAt(createdAt = new Date()) {
  const expiresAt = new Date(createdAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + SWAP_OFFER_LIFETIME_DAYS);
  return expiresAt;
}

export function isSwapOfferExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export async function expirePendingSwapOffers(
  db: Pick<PrismaClient, "swapRequest">,
  scope: { userId?: string; swapId?: string; pendingPairKey?: string } = {},
  now = new Date(),
) {
  return db.swapRequest.updateMany({
    where: {
      status: SwapStatus.PENDING,
      expiresAt: { lte: now },
      ...(scope.swapId ? { id: scope.swapId } : {}),
      ...(scope.pendingPairKey ? { pendingPairKey: scope.pendingPairKey } : {}),
      ...(scope.userId
        ? { OR: [{ senderId: scope.userId }, { receiverId: scope.userId }] }
        : {}),
    },
    data: { status: SwapStatus.EXPIRED, pendingPairKey: null },
  });
}
