import { describe, expect, it } from "vitest";
import { reportBelongsToSwap } from "./report-context";

const swap = {
  senderId: "sender",
  receiverId: "receiver",
  senderItemId: "sender-item",
  receiverItemId: "receiver-item",
};

describe("reportBelongsToSwap", () => {
  it("accepts a report against the other participant", () => {
    expect(
      reportBelongsToSwap(
        "sender",
        { targetType: "USER", targetUserId: "receiver", itemId: null },
        swap,
      ),
    ).toBe(true);
  });

  it("rejects a report from someone outside the exchange", () => {
    expect(
      reportBelongsToSwap(
        "stranger",
        { targetType: "USER", targetUserId: "receiver", itemId: null },
        swap,
      ),
    ).toBe(false);
  });

  it("rejects a report against the reporter or an unrelated user", () => {
    expect(
      reportBelongsToSwap(
        "sender",
        { targetType: "USER", targetUserId: "sender", itemId: null },
        swap,
      ),
    ).toBe(false);
  });

  it("only accepts items that belong to the exchange", () => {
    expect(
      reportBelongsToSwap(
        "receiver",
        { targetType: "ITEM", targetUserId: "sender", itemId: "sender-item" },
        swap,
      ),
    ).toBe(true);
    expect(
      reportBelongsToSwap(
        "receiver",
        { targetType: "ITEM", targetUserId: "sender", itemId: "other-item" },
        swap,
      ),
    ).toBe(false);
  });
});
