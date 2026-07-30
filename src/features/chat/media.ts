import { MediaOwnerType, Prisma } from "@prisma/client";

export const INVALID_CHAT_MEDIA = "INVALID_CHAT_MEDIA";
export const MAX_CHAT_IMAGES = 4;

export async function claimChatMedia(
  tx: Prisma.TransactionClient,
  {
    imageIds,
    userId,
    messageId,
    kind,
  }: {
    imageIds: string[];
    userId: string;
    messageId: string;
    kind: "deal" | "item";
  },
) {
  if (imageIds.length === 0) return;
  if (imageIds.length > MAX_CHAT_IMAGES) throw new Error(INVALID_CHAT_MEDIA);

  const uniqueIds = [...new Set(imageIds)];
  if (uniqueIds.length !== imageIds.length) throw new Error(INVALID_CHAT_MEDIA);

  const where: Prisma.MediaAssetWhereInput = {
    id: { in: uniqueIds },
    ownerId: userId,
    ownerType: MediaOwnerType.CHAT,
    itemId: null,
    dealMessageId: null,
    itemThreadMessageId: null,
  };
  const ownedAssets = await tx.mediaAsset.findMany({
    where,
    select: { id: true },
  });
  if (ownedAssets.length !== uniqueIds.length) throw new Error(INVALID_CHAT_MEDIA);

  const claimed = await tx.mediaAsset.updateMany({
    where,
    data:
      kind === "deal"
        ? { dealMessageId: messageId }
        : { itemThreadMessageId: messageId },
  });
  if (claimed.count !== uniqueIds.length) throw new Error(INVALID_CHAT_MEDIA);
}
