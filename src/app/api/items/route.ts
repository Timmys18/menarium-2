import { ItemStatus, ItemType, Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { actionResponse, errorResponse, getPaging, listResponse, parseJson } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeItem } from "@/features/items/serializers";
import { itemPayloadSchema } from "@/features/items/validation";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { limit, offset } = getPaging(req);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();
  const city = searchParams.get("city")?.trim();
  const type = searchParams.get("type")?.trim();
  const acceptsAnything = searchParams.get("acceptsAnything");

  const parsedType = type === ItemType.THING || type === ItemType.SERVICE ? type : undefined;
  const where: Prisma.ItemWhereInput = {
    status: ItemStatus.ACTIVE,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
    ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
    ...(parsedType ? { type: parsedType } : {}),
    ...(acceptsAnything === "true" ? { acceptsAnything: true } : {}),
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

export async function POST(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "items:create");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = itemPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(z.prettifyError(parsed.error), 400);
  }

  const data = parsed.data;
  const item = await prisma.item.create({
    data: {
      title: data.title,
      type: data.type,
      category: data.category,
      description: data.description,
      city: data.city,
      isOnline: data.isOnline,
      desired: data.desired,
      acceptsAnything: data.acceptsAnything,
      extraOfferText: data.extraOfferText || null,
      ownerId: auth.userId,
      images: {
        create: data.images.map((image) => ({
          ownerId: auth.userId,
          ownerType: "ITEM",
          url: image.url,
          contentType: image.contentType,
          sizeBytes: image.sizeBytes,
        })),
      },
    },
    include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
  });

  return actionResponse(serializeItem(item), {}, 201);
}
