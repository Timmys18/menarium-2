import { SwapStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canPerformSwapAction,
  itemStatusAfterSwapCancel,
  nextSwapStatusAfterComplete,
  shouldSkipCompleteNotification,
} from "@/features/exchange/transitions";

describe("canPerformSwapAction", () => {
  it("allows receiver to accept pending swap", () => {
    expect(canPerformSwapAction("accept", { status: SwapStatus.PENDING, role: "receiver" })).toBe(true);
  });

  it("blocks sender from accepting", () => {
    expect(canPerformSwapAction("accept", { status: SwapStatus.PENDING, role: "sender" })).toBe(false);
  });

  it("blocks accept on accepted swap", () => {
    expect(canPerformSwapAction("accept", { status: SwapStatus.ACCEPTED, role: "receiver" })).toBe(false);
  });

  it("allows sender revoke on pending", () => {
    expect(canPerformSwapAction("revoke", { status: SwapStatus.PENDING, role: "sender" })).toBe(true);
  });

  it("allows complete on accepted for both roles", () => {
    expect(canPerformSwapAction("complete", { status: SwapStatus.ACCEPTED, role: "sender" })).toBe(true);
    expect(canPerformSwapAction("complete", { status: SwapStatus.ACCEPTED, role: "receiver" })).toBe(true);
  });

  it("blocks complete on pending", () => {
    expect(canPerformSwapAction("complete", { status: SwapStatus.PENDING, role: "receiver" })).toBe(false);
  });
});

describe("nextSwapStatusAfterComplete", () => {
  it("stays accepted until both confirm", () => {
    expect(nextSwapStatusAfterComplete(true, false)).toBe(SwapStatus.ACCEPTED);
    expect(nextSwapStatusAfterComplete(false, true)).toBe(SwapStatus.ACCEPTED);
  });

  it("completes when both confirm", () => {
    expect(nextSwapStatusAfterComplete(true, true)).toBe(SwapStatus.COMPLETED);
  });
});

describe("complete idempotency", () => {
  it("skips duplicate complete notifications", () => {
    expect(shouldSkipCompleteNotification(true)).toBe(true);
    expect(shouldSkipCompleteNotification(false)).toBe(false);
  });
});

describe("itemStatusAfterSwapCancel", () => {
  it("restores active when no other accepted swaps", () => {
    expect(itemStatusAfterSwapCancel(false)).toBe("ACTIVE");
  });

  it("keeps in_deal when another accepted swap exists", () => {
    expect(itemStatusAfterSwapCancel(true)).toBe("IN_DEAL");
  });
});
