import { ItemStatus, SwapStatus } from "@prisma/client";

export const terminalSwapStatuses: SwapStatus[] = [
  SwapStatus.DECLINED,
  SwapStatus.COMPLETED,
  SwapStatus.CANCELLED,
];

export function canonicalSwapPairKey(senderItemId: string, receiverItemId: string) {
  return [senderItemId, receiverItemId].sort().join(":");
}

export function pendingSwapOfferKey(senderItemId: string, receiverItemId: string) {
  return `${senderItemId}->${receiverItemId}`;
}

export function canOpenDealChat(status: SwapStatus) {
  return status !== SwapStatus.PENDING && status !== SwapStatus.DECLINED;
}

export function canWriteDealChat(status: SwapStatus) {
  return status === SwapStatus.ACCEPTED;
}

export function isActiveItemStatus(status: ItemStatus) {
  return status === ItemStatus.ACTIVE;
}
