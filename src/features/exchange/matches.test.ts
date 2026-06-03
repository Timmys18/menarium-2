import { describe, expect, it } from "vitest";
import { pickMutualPendingSwapIds } from "./matches";

describe("pickMutualPendingSwapIds", () => {
  it("returns only reciprocal pending offers", () => {
    const ids = pickMutualPendingSwapIds(
      [
        {
          id: "incoming-reciprocal",
          senderId: "partner",
          receiverId: "current",
          senderItemId: "partner-item",
          receiverItemId: "current-item",
        },
        {
          id: "outgoing-reciprocal",
          senderId: "current",
          receiverId: "partner",
          senderItemId: "current-item",
          receiverItemId: "partner-item",
        },
        {
          id: "one-way-offer",
          senderId: "another",
          receiverId: "current",
          senderItemId: "another-item",
          receiverItemId: "current-item",
        },
      ],
      "current",
    );

    expect([...ids]).toEqual(["incoming-reciprocal"]);
  });

  it("groups reciprocal offers by item pair and prefers the offer received by the current user", () => {
    const ids = pickMutualPendingSwapIds(
      [
        {
          id: "sent-first",
          senderId: "current",
          receiverId: "partner",
          senderItemId: "current-item",
          receiverItemId: "partner-item",
        },
        {
          id: "received-second",
          senderId: "partner",
          receiverId: "current",
          senderItemId: "partner-item",
          receiverItemId: "current-item",
        },
      ],
      "current",
    );

    expect(ids.has("received-second")).toBe(true);
    expect(ids.has("sent-first")).toBe(false);
  });
});
