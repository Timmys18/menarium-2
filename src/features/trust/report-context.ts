type SwapReportContext = {
  senderId: string;
  receiverId: string;
  senderItemId: string;
  receiverItemId: string;
};

type ReportTarget = {
  targetType: "USER" | "ITEM";
  targetUserId: string | null;
  itemId: string | null;
};

export function reportBelongsToSwap(
  reporterId: string,
  target: ReportTarget,
  swap: SwapReportContext,
) {
  const partnerId =
    swap.senderId === reporterId
      ? swap.receiverId
      : swap.receiverId === reporterId
        ? swap.senderId
        : null;

  if (!partnerId || target.targetUserId !== partnerId) return false;
  if (target.targetType === "USER") return true;

  return Boolean(
    target.itemId &&
      (target.itemId === swap.senderItemId || target.itemId === swap.receiverItemId),
  );
}
