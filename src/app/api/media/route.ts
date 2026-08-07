import { MediaOwnerType } from "@prisma/client";
import { NextRequest } from "next/server";
import { actionResponse, errorResponse } from "@/lib/api";
import { checkMediaDeleteRateLimit, checkMediaUploadRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { deleteStoredUpload, storeImageUpload } from "@/lib/storage";
import { readFormDataWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { runSerializableTransaction } from "@/lib/transactions";
import { requireUserId } from "@/server/session";
import { reportError } from "@/lib/logger";

const MAX_MULTIPART_REQUEST_BYTES = 8 * 1024 * 1024 + 128 * 1024;
const MAX_UNATTACHED_ASSETS = 32;
const MAX_UNATTACHED_BYTES = 128 * 1024 * 1024;
const STALE_UPLOAD_AGE_MS = 24 * 60 * 60 * 1000;

async function cleanupStaleUploads(userId: string) {
  const stale = await prisma.mediaAsset.findMany({
    where: {
      ownerId: userId,
      itemId: null,
      dealMessageId: null,
      itemThreadMessageId: null,
      createdAt: { lt: new Date(Date.now() - STALE_UPLOAD_AGE_MS) },
    },
    select: { id: true, key: true },
    take: 50,
  });

  for (const asset of stale) {
    const deleted = await prisma.mediaAsset.deleteMany({
      where: {
        id: asset.id,
        ownerId: userId,
        itemId: null,
        dealMessageId: null,
        itemThreadMessageId: null,
      },
    });
    if (deleted.count && asset.key) {
      await deleteStoredUpload(asset.key).catch((error) => {
        reportError("media.stale_object_cleanup_failed", error, { storageKey: asset.key });
      });
    }
  }
}

export async function POST(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkMediaUploadRateLimit(auth.userId);
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const formData = await readFormDataWithinLimit(req, MAX_MULTIPART_REQUEST_BYTES).catch((error) => {
    if (error instanceof RequestBodyTooLargeError) return "too-large" as const;
    return null;
  });
  if (formData === "too-large") return errorResponse("Файл слишком большой. Максимум 8 МБ", 413);
  if (!formData) return errorResponse("Не удалось прочитать загружаемый файл", 400);
  const file = formData.get("file");
  const rawOwnerType = formData.get("ownerType");
  const ownerType =
    rawOwnerType === MediaOwnerType.USER ||
    rawOwnerType === MediaOwnerType.ITEM ||
    rawOwnerType === MediaOwnerType.CHAT
      ? rawOwnerType
      : null;
  const rawItemId = formData.get("itemId");

  if (!(file instanceof File)) return errorResponse("Передайте файл в поле file", 400);
  if (!ownerType) return errorResponse("Укажите корректный тип загружаемого изображения", 400);
  if (typeof rawItemId === "string" && rawItemId.trim()) {
    return errorResponse("Изображение привязывается к объявлению только при его сохранении", 400);
  }

  try {
    await cleanupStaleUploads(auth.userId);

    const [unattachedCount, unattachedSize] = await Promise.all([
      prisma.mediaAsset.count({
        where: {
          ownerId: auth.userId,
          itemId: null,
          dealMessageId: null,
          itemThreadMessageId: null,
        },
      }),
      prisma.mediaAsset.aggregate({
        where: {
          ownerId: auth.userId,
          itemId: null,
          dealMessageId: null,
          itemThreadMessageId: null,
        },
        _sum: { sizeBytes: true },
      }),
    ]);
    if (unattachedCount >= MAX_UNATTACHED_ASSETS) {
      return errorResponse("Слишком много незавершённых загрузок. Удалите лишние фото", 409);
    }
    if ((unattachedSize._sum.sizeBytes ?? 0) + file.size > MAX_UNATTACHED_BYTES) {
      return errorResponse("Превышен лимит незавершённых загрузок", 413);
    }

    const stored = await storeImageUpload(file);
    let asset;
    try {
      asset = await runSerializableTransaction(async (tx) => {
        const [currentCount, currentSize] = await Promise.all([
          tx.mediaAsset.count({
            where: {
              ownerId: auth.userId,
              itemId: null,
              dealMessageId: null,
              itemThreadMessageId: null,
            },
          }),
          tx.mediaAsset.aggregate({
            where: {
              ownerId: auth.userId,
              itemId: null,
              dealMessageId: null,
              itemThreadMessageId: null,
            },
            _sum: { sizeBytes: true },
          }),
        ]);
        if (currentCount >= MAX_UNATTACHED_ASSETS) throw new Error("UNATTACHED_ASSET_LIMIT");
        if ((currentSize._sum.sizeBytes ?? 0) + stored.sizeBytes > MAX_UNATTACHED_BYTES) {
          throw new Error("UNATTACHED_BYTES_LIMIT");
        }

        return tx.mediaAsset.create({
          data: {
            ownerId: auth.userId,
            ownerType,
            url: stored.url,
            key: stored.key,
            contentType: stored.contentType,
            sizeBytes: stored.sizeBytes,
            width: stored.width,
            height: stored.height,
          },
        });
      });
    } catch (error) {
      await deleteStoredUpload(stored.key).catch((cleanupError) => {
        reportError("media.upload_compensation_failed", cleanupError, { storageKey: stored.key });
      });
      throw error;
    }

    return actionResponse(
      {
        id: asset.id,
        url: asset.url,
        key: asset.key,
        contentType: asset.contentType,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
      },
      {},
      201,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMPTY_FILE") return errorResponse("Файл пуст", 400);
      if (error.message === "INVALID_IMAGE_CONTENT") {
        return errorResponse("Файл повреждён или не является поддерживаемым изображением", 400);
      }
      if (error.message === "CONTENT_TYPE_MISMATCH") {
        return errorResponse("Формат файла не соответствует его содержимому", 400);
      }
      if (error.message === "IMAGE_DIMENSIONS_TOO_LARGE") {
        return errorResponse("Слишком большое разрешение изображения", 413);
      }
      if (error.message === "UNATTACHED_ASSET_LIMIT") {
        return errorResponse("Слишком много незавершённых загрузок. Удалите лишние фото", 409);
      }
      if (error.message === "UNATTACHED_BYTES_LIMIT") {
        return errorResponse("Превышен лимит незавершённых загрузок", 413);
      }
      if (error.message === "FILE_TOO_LARGE") return errorResponse("Файл слишком большой. Максимум 8 МБ", 413);
      if (error.message === "STORAGE_NOT_CONFIGURED") return errorResponse("Хранилище не настроено", 500);
    }
    reportError("media.upload_failed", error);
    return errorResponse("Не удалось загрузить файл", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkMediaDeleteRateLimit(auth.userId);
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return errorResponse("Укажите id изображения", 400);

  const asset = await prisma.mediaAsset.findFirst({
    where: {
      id,
      ownerId: auth.userId,
      itemId: null,
      dealMessageId: null,
      itemThreadMessageId: null,
    },
    select: { id: true, key: true, url: true, ownerType: true },
  });
  if (!asset) return errorResponse("Изображение не найдено или уже используется", 404);

  if (asset.ownerType === MediaOwnerType.USER) {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { image: true },
    });
    if (user?.image === asset.url) {
      return errorResponse("Сначала выберите другой аватар или удалите его в профиле", 409);
    }
  }

  const deleted = await prisma.mediaAsset.deleteMany({
    where: {
      id: asset.id,
      ownerId: auth.userId,
      itemId: null,
      dealMessageId: null,
      itemThreadMessageId: null,
    },
  });
  if (!deleted.count) return errorResponse("Изображение уже используется", 409);

  if (asset.key) {
    await deleteStoredUpload(asset.key).catch((error) => {
      reportError("media.object_deletion_failed", error, { storageKey: asset.key });
    });
  }

  return actionResponse({ deleted: true, id: asset.id });
}
