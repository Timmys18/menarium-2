import { actionResponse, errorResponse } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { storeImageUpload } from "@/lib/storage";
import { requireUserId } from "@/server/session";

export async function POST(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "media:upload");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const formData = await req.formData();
  const file = formData.get("file");
  const ownerType = formData.get("ownerType") === "USER" ? "USER" : "ITEM";
  const itemId = typeof formData.get("itemId") === "string" ? String(formData.get("itemId")) : undefined;

  if (!(file instanceof File)) return errorResponse("Передайте файл в поле file", 400);

  try {
    const stored = await storeImageUpload(file, auth.userId);
    const asset = await prisma.mediaAsset.create({
      data: {
        ownerId: auth.userId,
        ownerType,
        itemId,
        url: stored.url,
        key: stored.key,
        contentType: stored.contentType,
        sizeBytes: stored.sizeBytes,
      },
    });

    return actionResponse(
      {
        id: asset.id,
        url: asset.url,
        key: asset.key,
        contentType: asset.contentType,
        sizeBytes: asset.sizeBytes,
      },
      {},
      201,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNSUPPORTED_CONTENT_TYPE") return errorResponse("Поддерживаются только изображения", 400);
      if (error.message === "FILE_TOO_LARGE") return errorResponse("Файл слишком большой. Максимум 8 МБ", 413);
      if (error.message === "STORAGE_NOT_CONFIGURED") return errorResponse("Хранилище не настроено", 500);
    }
    return errorResponse("Не удалось загрузить файл", 500);
  }
}
