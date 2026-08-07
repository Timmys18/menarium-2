import { ItemStatus, SwapStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { getPaging, listResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeItem } from "@/features/items/serializers";

const SWIPE_PASS_RESHOW_AFTER_DAYS = 180;

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { limit, offset } = getPaging(req, 12, 30);

  const passCutoff = new Date(Date.now() - SWIPE_PASS_RESHOW_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const where = {
    status: ItemStatus.ACTIVE,
    owner: {
      id: { not: auth.userId },
      status: "ACTIVE" as const,
      blocksCreated: { none: { blockedId: auth.userId } },
      blocksReceived: { none: { blockerId: auth.userId } },
    },
    swipePasses: { none: { userId: auth.userId, createdAt: { gte: passCutoff } } },
    receivedSwaps: { none: { senderId: auth.userId, status: SwapStatus.PENDING } },
  };

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.item.count({ where }),
  ]);

  return listResponse(items.map(serializeItem), { limit, offset }, total);
}
