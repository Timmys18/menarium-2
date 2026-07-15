import { ItemStatus, Prisma, UserStatus } from "@prisma/client";

type ItemViewer = {
  id: string;
  isAdmin: boolean;
} | null;

export function visibleItemWhere(id: string, viewer: ItemViewer): Prisma.ItemWhereInput {
  if (viewer?.isAdmin) return { id };

  const visibility: Prisma.ItemWhereInput[] = [
    { status: ItemStatus.ACTIVE, owner: { status: UserStatus.ACTIVE } },
  ];
  if (viewer) visibility.push({ ownerId: viewer.id });

  return { id, OR: visibility };
}

export function canInteractWithItem(status: ItemStatus, viewerIsAdmin: boolean) {
  return status === ItemStatus.ACTIVE && !viewerIsAdmin;
}
