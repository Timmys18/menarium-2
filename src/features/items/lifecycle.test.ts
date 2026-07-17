import { ItemStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getItemLifecycleTransition } from "./lifecycle";

describe("getItemLifecycleTransition", () => {
  it("pauses an active item without live exchanges", () => {
    expect(
      getItemLifecycleTransition({
        status: ItemStatus.ACTIVE,
        action: "pause",
        hasActiveSwap: false,
      }),
    ).toEqual({ ok: true, nextStatus: ItemStatus.PAUSED });
  });

  it("does not pause an item with a pending or accepted exchange", () => {
    expect(
      getItemLifecycleTransition({
        status: ItemStatus.ACTIVE,
        action: "pause",
        hasActiveSwap: true,
      }),
    ).toEqual({ ok: false, reason: "HAS_ACTIVE_SWAP" });
  });

  it("returns a paused item to the catalog", () => {
    expect(
      getItemLifecycleTransition({
        status: ItemStatus.PAUSED,
        action: "resume",
        hasActiveSwap: false,
      }),
    ).toEqual({ ok: true, nextStatus: ItemStatus.ACTIVE });
  });

  it.each([ItemStatus.IN_DEAL, ItemStatus.ARCHIVED])(
    "does not resume protected status %s",
    (status) => {
      expect(
        getItemLifecycleTransition({ status, action: "resume", hasActiveSwap: false }),
      ).toEqual({ ok: false, reason: "NOT_PAUSED" });
    },
  );
});
