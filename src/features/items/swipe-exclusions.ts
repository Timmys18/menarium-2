import { SwapStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getSwipeExclusions(userId: string) {
  const [swaps, passes, blocks] = await Promise.all([
    prisma.swapRequest.findMany({
      where: { senderId: userId, status: SwapStatus.PENDING },
      select: { receiverItemId: true },
    }),
    prisma.swipePass.findMany({
      where: { userId },
      select: { itemId: true },
    }),
    prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);

  return {
    itemIds: [...new Set([...swaps.map((swap) => swap.receiverItemId), ...passes.map((pass) => pass.itemId)])],
    ownerIds: [
      ...new Set(
        blocks.map((block) => (block.blockerId === userId ? block.blockedId : block.blockerId)),
      ),
    ],
  };
}
