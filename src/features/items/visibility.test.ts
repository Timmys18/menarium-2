import { ItemStatus, UserStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canInteractWithItem, visibleItemWhere } from "./visibility";

describe("visibleItemWhere", () => {
  it("shows only active items from active owners to anonymous viewers", () => {
    expect(visibleItemWhere("item-1", null)).toEqual({
      id: "item-1",
      OR: [{ status: ItemStatus.ACTIVE, owner: { status: UserStatus.ACTIVE } }],
    });
  });

  it("also lets an owner inspect their non-public item", () => {
    expect(visibleItemWhere("item-1", { id: "owner-1", isAdmin: false })).toEqual({
      id: "item-1",
      OR: [
        { status: ItemStatus.ACTIVE, owner: { status: UserStatus.ACTIVE } },
        { ownerId: "owner-1" },
      ],
    });
  });

  it("lets an administrator inspect any item without making it interactive", () => {
    expect(visibleItemWhere("item-1", { id: "admin-1", isAdmin: true })).toEqual({ id: "item-1" });
    expect(canInteractWithItem(ItemStatus.ARCHIVED, true)).toBe(false);
  });
});
