import { NextRequest } from "next/server";
import { SwapStatus } from "@prisma/client";
import { getPaging, listResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeSwap } from "@/features/exchange/serializers";
import { pickMutualPendingSwapIds } from "@/features/exchange/matches";
import { expirePendingSwapOffers } from "@/features/exchange/expiration";

const swapInclude = {
  sender: { select: { id: true, name: true, city: true, image: true } },
  receiver: { select: { id: true, name: true, city: true, image: true } },
  senderItem: {
    include: {
      images: true,
      owner: { select: { id: true, name: true, city: true, image: true } },
    },
  },
  receiverItem: {
    include: {
      images: true,
      owner: { select: { id: true, name: true, city: true, image: true } },
    },
  },
} as const;

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  await expirePendingSwapOffers(prisma, { userId: auth.userId });

  const { limit, offset } = getPaging(req, 50, 80);
  const where = {
    OR: [{ senderId: auth.userId }, { receiverId: auth.userId }],
  };

  const [swaps, total, pendingRows] = await Promise.all([
    prisma.swapRequest.findMany({
      where,
      include: swapInclude,
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.swapRequest.count({ where }),
    prisma.swapRequest.findMany({
      where: { ...where, status: SwapStatus.PENDING },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        senderItemId: true,
        receiverItemId: true,
      },
    }),
  ]);

  const mutualPendingIds = pickMutualPendingSwapIds(pendingRows, auth.userId);
  const incoming = swaps.filter((swap) => swap.receiverId === auth.userId).map(serializeSwap);
  const outgoing = swaps.filter((swap) => swap.senderId === auth.userId).map(serializeSwap);
  const matches = swaps
    .filter(
      (swap) =>
        mutualPendingIds.has(swap.id) ||
        swap.status === SwapStatus.ACCEPTED ||
        swap.status === SwapStatus.COMPLETED,
    )
    .map(serializeSwap);

  return listResponse(swaps.map(serializeSwap), { limit, offset }, total, {
    incoming,
    outgoing,
    matches,
  });
}
