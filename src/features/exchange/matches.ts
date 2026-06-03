import { canonicalSwapPairKey } from "@/lib/domain";

type PendingSwap = {
  id: string;
  senderId: string;
  receiverId: string;
  senderItemId: string;
  receiverItemId: string;
};

function offerKey(swap: PendingSwap) {
  return `${swap.senderId}|${swap.receiverId}|${swap.senderItemId}|${swap.receiverItemId}`;
}

function inverseOfferKey(swap: PendingSwap) {
  return `${swap.receiverId}|${swap.senderId}|${swap.receiverItemId}|${swap.senderItemId}`;
}

export function pickMutualPendingSwapIds(swaps: PendingSwap[], currentUserId: string) {
  const keys = new Set(swaps.map(offerKey));
  const groups = new Map<string, PendingSwap[]>();

  for (const swap of swaps) {
    if (!keys.has(inverseOfferKey(swap))) continue;
    const key = canonicalSwapPairKey(swap.senderItemId, swap.receiverItemId);
    groups.set(key, [...(groups.get(key) ?? []), swap]);
  }

  const ids = new Set<string>();
  for (const group of groups.values()) {
    const preferred = group.find((swap) => swap.receiverId === currentUserId) ?? group[0];
    if (preferred) ids.add(preferred.id);
  }

  return ids;
}
