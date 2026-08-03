import { ItemStatus, ItemType, Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { actionResponse, errorResponse, getPaging, listResponse, parseJson } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { serializeItem } from "@/features/items/serializers";
import { itemPayloadSchema } from "@/features/items/validation";
import { claimItemMedia, INVALID_ITEM_MEDIA } from "@/features/media/item-media";
import { trackProductEvent } from "@/lib/product-analytics";
import { runSerializableTransaction } from "@/lib/transactions";
import { reportError } from "@/lib/logger";
import { categoryLabel, legacyCategoryId } from "@/features/taxonomy/catalog";
import { findCityByName, getCity } from "@/features/locations/cities";
import { findSearchItemIds } from "@/features/items/search";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { limit, offset } = getPaging(req);
  const q = searchParams.get("q")?.trim();
  const rawCategory = searchParams.get("category")?.trim();
  const rawCity = searchParams.get("city")?.trim();
  const category = rawCategory ? legacyCategoryId(rawCategory) ?? rawCategory : undefined;
  const city = rawCity ? getCity(rawCity)?.id ?? findCityByName(rawCity)?.id ?? rawCity : undefined;
  const type = searchParams.get("type")?.trim();
  const acceptsAnything = searchParams.get("acceptsAnything");

  const parsedType = type === ItemType.THING || type === ItemType.SERVICE ? type : undefined;
  const [searchItemIds, selectedCategoryLabel, selectedCity] = await Promise.all([
    q ? findSearchItemIds(q) : Promise.resolve(undefined),
    Promise.resolve(categoryLabel(category)),
    Promise.resolve(getCity(city)),
  ]);
  const filters: Prisma.ItemWhereInput[] = [
    ...(q ? [{ id: { in: searchItemIds ?? [] } }] : []),
    ...(category
      ? [{ OR: [{ categoryId: category }, ...(selectedCategoryLabel ? [{ category: selectedCategoryLabel }] : [])] }]
      : []),
    ...(city
      ? [{ OR: [{ cityId: city }, ...(selectedCity ? [{ city: { equals: selectedCity.name, mode: "insensitive" as const } }] : [])] }]
      : []),
  ];
  const where: Prisma.ItemWhereInput = {
    status: ItemStatus.ACTIVE,
    ...(filters.length ? { AND: filters } : {}),
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
  const category = categoryLabel(data.categoryId);
  const city = getCity(data.cityId);
  if (!category || !city) return errorResponse("Выберите категорию и город из списка.", 400);
  try {
    const item = await runSerializableTransaction(async (tx) => {
      const created = await tx.item.create({
        data: {
          title: data.title,
          type: data.type,
          category,
          categoryId: data.categoryId,
          description: data.description,
          city: city.name,
          cityId: city.id,
          isOnline: data.isOnline,
          desired: data.desired,
          acceptsAnything: data.acceptsAnything,
          extraOfferText: data.extraOfferText || null,
          ownerId: auth.userId,
        },
      });

      await claimItemMedia(tx, {
        imageIds: data.images.map((image) => image.id),
        userId: auth.userId,
        itemId: created.id,
        allowCurrentItem: false,
      });

      return tx.item.findUniqueOrThrow({
        where: { id: created.id },
        include: { owner: { select: { id: true, name: true, city: true, image: true } }, images: true },
      });
    });

    await trackProductEvent({
      name: "item_created",
      actorId: auth.userId,
      entityType: "Item",
      entityId: item.id,
      dedupeKey: `item:${item.id}:created`,
    });

    return actionResponse(serializeItem(item), {}, 201);
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_ITEM_MEDIA) {
      return errorResponse("Одно или несколько изображений недоступны. Загрузите их заново", 400);
    }
    reportError("item.create_failed", error);
    return errorResponse("Не удалось создать объявление", 500);
  }
}
