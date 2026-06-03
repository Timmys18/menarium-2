import { describe, expect, it } from "vitest";
import { ItemStatus, SwapStatus } from "@prisma/client";
import {
  canOpenDealChat,
  canWriteDealChat,
  canonicalSwapPairKey,
  isActiveItemStatus,
  terminalSwapStatuses,
} from "./domain";

describe("domain helpers", () => {
  it("builds the same pair key regardless of item order", () => {
    expect(canonicalSwapPairKey("item-b", "item-a")).toBe("item-a:item-b");
    expect(canonicalSwapPairKey("item-a", "item-b")).toBe("item-a:item-b");
  });

  it("keeps only final swap states in the terminal set", () => {
    expect(terminalSwapStatuses).toEqual([
      SwapStatus.DECLINED,
      SwapStatus.COMPLETED,
      SwapStatus.CANCELLED,
    ]);
    expect(terminalSwapStatuses).not.toContain(SwapStatus.PENDING);
    expect(terminalSwapStatuses).not.toContain(SwapStatus.ACCEPTED);
  });

  it("opens deal chat after a decision but only allows writing while accepted", () => {
    expect(canOpenDealChat(SwapStatus.PENDING)).toBe(false);
    expect(canOpenDealChat(SwapStatus.DECLINED)).toBe(false);
    expect(canOpenDealChat(SwapStatus.ACCEPTED)).toBe(true);
    expect(canOpenDealChat(SwapStatus.COMPLETED)).toBe(true);
    expect(canOpenDealChat(SwapStatus.CANCELLED)).toBe(true);

    expect(canWriteDealChat(SwapStatus.ACCEPTED)).toBe(true);
    expect(canWriteDealChat(SwapStatus.COMPLETED)).toBe(false);
    expect(canWriteDealChat(SwapStatus.CANCELLED)).toBe(false);
  });

  it("treats only active items as exchangeable", () => {
    expect(isActiveItemStatus(ItemStatus.ACTIVE)).toBe(true);
    expect(isActiveItemStatus(ItemStatus.IN_DEAL)).toBe(false);
    expect(isActiveItemStatus(ItemStatus.ARCHIVED)).toBe(false);
  });
});
