import { NextRequest } from "next/server";
import { getPaging, listResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeItem } from "@/features/items/serializers";

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { limit, offset } = getPaging(req);
  const where = { ownerId: auth.userId };

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.item.count({ where }),
  ]);

  return listResponse(items.map(serializeItem), { limit, offset }, total);
}
