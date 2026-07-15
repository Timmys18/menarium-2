import { MediaOwnerType, Prisma } from "@prisma/client";

export const INVALID_ITEM_MEDIA = "INVALID_ITEM_MEDIA";

export async function claimItemMedia(
  tx: Prisma.TransactionClient,
  {
    imageIds,
    userId,
    itemId,
    allowCurrentItem,
  }: {
    imageIds: string[];
    userId: string;
    itemId: string;
    allowCurrentItem: boolean;
  },
) {
  if (imageIds.length === 0) return;

  const where: Prisma.MediaAssetWhereInput = {
    id: { in: imageIds },
    ownerId: userId,
    ownerType: MediaOwnerType.ITEM,
    ...(allowCurrentItem ? { OR: [{ itemId: null }, { itemId }] } : { itemId: null }),
  };
  const ownedAssets = await tx.mediaAsset.findMany({ where, select: { id: true } });
  if (ownedAssets.length !== imageIds.length) throw new Error(INVALID_ITEM_MEDIA);

  const claimed = await tx.mediaAsset.updateMany({
    where,
    data: { itemId, ownerType: MediaOwnerType.ITEM },
  });
  if (claimed.count !== imageIds.length) throw new Error(INVALID_ITEM_MEDIA);
}
