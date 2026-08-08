import { z } from "zod";
import bcrypt from "bcryptjs";
import { ItemStatus, MediaOwnerType, SwapStatus, UserStatus } from "@prisma/client";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { emailVerifyIdentifier, passwordResetIdentifier } from "@/lib/auth-tokens";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";
import { deleteMediaObjects } from "@/features/media/cleanup";
import { invalidateUserSessionState } from "@/lib/auth";
import { runSerializableTransaction } from "@/lib/transactions";
import { reportError } from "@/lib/logger";
import { getCity } from "@/features/locations/cities";

function serializeUser(user: {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  cityId: string | null;
  image: string | null;
  createdAt: Date;
}) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, name: true, city: true, cityId: true, image: true, createdAt: true },
  });
  if (!user) return errorResponse("Пользователь не найден", 404);

  return actionResponse(serializeUser(user), serializeUser(user));
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  cityId: z.string().trim().max(180).optional().or(z.literal("")),
  image: z.string().trim().max(2048).optional().or(z.literal("")),
});

export async function PATCH(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "users:update-profile");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Некорректные данные профиля", 400);
  const city = parsed.data.cityId ? getCity(parsed.data.cityId) : null;
  if (parsed.data.cityId && !city) return errorResponse("Выберите город из списка.", 400);

  try {
    const result = await runSerializableTransaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: auth.userId },
        select: { image: true },
      });
      if (!current) throw new Error("USER_NOT_FOUND");

      const requestedImage = parsed.data.image || null;
      const profileAssets = await tx.mediaAsset.findMany({
        where: {
          ownerId: auth.userId,
          ownerType: MediaOwnerType.USER,
          itemId: null,
        },
        select: { id: true, key: true, url: true },
      });
      const selectedAsset = requestedImage
        ? profileAssets.find((asset) => asset.url === requestedImage)
        : undefined;

      // Legacy OAuth/demo avatars may remain unchanged, but every newly selected
      // URL must come from this user's own media upload.
      if (requestedImage && requestedImage !== current.image && !selectedAsset) {
        throw new Error("INVALID_PROFILE_IMAGE");
      }

      const obsoleteAssets = profileAssets.filter((asset) => asset.id !== selectedAsset?.id);
      const user = await tx.user.update({
        where: { id: auth.userId },
        data: {
          name: parsed.data.name || null,
          city: city?.name ?? null,
          cityId: city?.id ?? null,
          image: requestedImage,
        },
        select: { id: true, email: true, name: true, city: true, cityId: true, image: true, createdAt: true },
      });
      if (obsoleteAssets.length) {
        await tx.mediaAsset.deleteMany({
          where: { id: { in: obsoleteAssets.map((asset) => asset.id) }, ownerId: auth.userId },
        });
      }

      return { user, obsoleteKeys: obsoleteAssets.map((asset) => asset.key) };
    });

    await deleteMediaObjects(result.obsoleteKeys);
    return actionResponse(serializeUser(result.user), serializeUser(result.user));
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PROFILE_IMAGE") {
      return errorResponse("Выберите аватар, загруженный в вашем профиле", 400);
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return errorResponse("Пользователь не найден", 404);
    }
    reportError("profile.update_failed", error);
    return errorResponse("Не удалось сохранить профиль", 500);
  }
}

const deleteSchema = z.object({
  password: z.string().min(1, "Введите пароль для подтверждения"),
});

export async function DELETE(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "users:delete-account");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Подтвердите пароль", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true, passwordHash: true },
  });
  if (!user?.passwordHash) return errorResponse("Пользователь не найден", 404);

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return errorResponse("Неверный пароль", 403);

  const activeSwaps = await prisma.swapRequest.count({
    where: {
      status: { in: [SwapStatus.PENDING, SwapStatus.ACCEPTED] },
      OR: [{ senderId: auth.userId }, { receiverId: auth.userId }],
    },
  });
  if (activeSwaps > 0) {
    return errorResponse("Завершите или отмените активные обмены перед удалением аккаунта", 409);
  }

  const activeItems = await prisma.item.count({
    where: { ownerId: auth.userId, status: ItemStatus.IN_DEAL },
  });
  if (activeItems > 0) {
    return errorResponse("У вас есть объявления в активной сделке. Сначала завершите обмены", 409);
  }

  const profileMedia = await prisma.mediaAsset.findMany({
    where: { ownerId: auth.userId, ownerType: "USER", itemId: null },
    select: { id: true, key: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.item.updateMany({
      where: { ownerId: auth.userId, status: { not: ItemStatus.ARCHIVED } },
      data: { status: ItemStatus.ARCHIVED },
    });
    await Promise.all([
      tx.account.deleteMany({ where: { userId: auth.userId } }),
      tx.session.deleteMany({ where: { userId: auth.userId } }),
      tx.swipePass.deleteMany({ where: { userId: auth.userId } }),
      tx.notification.deleteMany({ where: { userId: auth.userId } }),
      tx.pushSubscription.deleteMany({ where: { userId: auth.userId } }),
      tx.chatPreference.deleteMany({ where: { userId: auth.userId } }),
      tx.userBlock.deleteMany({
        where: { OR: [{ blockerId: auth.userId }, { blockedId: auth.userId }] },
      }),
      tx.verificationToken.deleteMany({
        where: {
          identifier: {
            in: [passwordResetIdentifier(user.email), emailVerifyIdentifier(user.email)],
          },
        },
      }),
      tx.mediaAsset.deleteMany({
        where: { id: { in: profileMedia.map((asset) => asset.id) } },
      }),
    ]);
    await tx.user.update({
      where: { id: auth.userId },
      data: {
        status: UserStatus.DELETED,
        deletedAt: new Date(),
        sessionVersion: { increment: 1 },
        email: `deleted+${auth.userId}@deleted.invalid`,
        emailVerified: null,
        passwordHash: null,
        name: "Удалённый пользователь",
        city: null,
        cityId: null,
        image: null,
        suspendedAt: null,
        suspensionReason: null,
      },
    });
  });

  await deleteMediaObjects(profileMedia.map((asset) => asset.key));
  await invalidateUserSessionState(auth.userId);

  return actionResponse(
    { ok: true, anonymized: true },
    { ok: true, message: "Аккаунт удалён, а история сделок сохранена в обезличенном виде." },
  );
}
