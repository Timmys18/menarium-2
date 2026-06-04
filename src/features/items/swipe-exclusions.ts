import { prisma } from "@/lib/prisma";

export async function getSwipeExcludedItemIds(userId: string) {
  const [swaps, passes] = await Promise.all([
    prisma.swapRequest.findMany({
      where: { senderId: userId },
      select: { receiverItemId: true },
    }),
    prisma.swipePass.findMany({
      where: { userId },
      select: { itemId: true },
    }),
  ]);

  return [...new Set([...swaps.map((s) => s.receiverItemId), ...passes.map((p) => p.itemId)])];
}
