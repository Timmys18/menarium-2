import { SwapStatus } from "@prisma/client";

export type SwapAction = "accept" | "decline" | "revoke" | "complete" | "cancel";
export type SwapParticipantRole = "sender" | "receiver";

export type SwapActionContext = {
  status: SwapStatus;
  role: SwapParticipantRole;
  alreadyCompleted?: boolean;
};

export function canPerformSwapAction(action: SwapAction, ctx: SwapActionContext): boolean {
  const { status, role } = ctx;

  switch (action) {
    case "accept":
      return status === SwapStatus.PENDING && role === "receiver";
    case "decline":
      return status === SwapStatus.PENDING && role === "receiver";
    case "revoke":
      return status === SwapStatus.PENDING && role === "sender";
    case "complete":
      return status === SwapStatus.ACCEPTED;
    case "cancel":
      return status === SwapStatus.ACCEPTED;
    default:
      return false;
  }
}

export function nextSwapStatusAfterComplete(
  senderCompleted: boolean,
  receiverCompleted: boolean,
): SwapStatus {
  return senderCompleted && receiverCompleted ? SwapStatus.COMPLETED : SwapStatus.ACCEPTED;
}

export function shouldSkipCompleteNotification(alreadyCompleted: boolean): boolean {
  return alreadyCompleted;
}

export function itemStatusAfterSwapComplete(): "ARCHIVED" {
  return "ARCHIVED";
}

export function itemStatusAfterSwapCancel(hasOtherAcceptedSwaps: boolean): "ACTIVE" | "IN_DEAL" {
  return hasOtherAcceptedSwaps ? "IN_DEAL" : "ACTIVE";
}
