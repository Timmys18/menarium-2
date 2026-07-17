import { ItemStatus } from "@prisma/client";

export type ItemLifecycleAction = "pause" | "resume";
export type ItemLifecycleFailure =
  | "HAS_ACTIVE_SWAP"
  | "NOT_ACTIVE"
  | "NOT_PAUSED";

export type ItemLifecycleResult =
  | { ok: true; nextStatus: ItemStatus }
  | { ok: false; reason: ItemLifecycleFailure };

export function getItemLifecycleTransition({
  status,
  action,
  hasActiveSwap,
}: {
  status: ItemStatus;
  action: ItemLifecycleAction;
  hasActiveSwap: boolean;
}): ItemLifecycleResult {
  if (action === "pause") {
    if (status !== ItemStatus.ACTIVE) return { ok: false, reason: "NOT_ACTIVE" };
    if (hasActiveSwap) return { ok: false, reason: "HAS_ACTIVE_SWAP" };
    return { ok: true, nextStatus: ItemStatus.PAUSED };
  }

  if (status !== ItemStatus.PAUSED) return { ok: false, reason: "NOT_PAUSED" };
  return { ok: true, nextStatus: ItemStatus.ACTIVE };
}
