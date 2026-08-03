import { describe, expect, it } from "vitest";
import { itemPayloadSchema } from "./validation";

const validPayload = {
  title: "Sony WH-1000XM5",
  type: "THING",
  categoryId: "thing.electronics.audio",
  description: "Наушники в отличном состоянии, полный комплект и аккуратное использование.",
  cityId: "москва-москва",
  isOnline: false,
  desired: ["Механическая клавиатура"],
  acceptsAnything: false,
  extraOfferText: "",
};

describe("itemPayloadSchema", () => {
  it("accepts media asset ids from /api/media upload", () => {
    const parsed = itemPayloadSchema.safeParse({
      ...validPayload,
      images: [{ id: "asset-1" }],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects arbitrary external image urls (security)", () => {
    const parsed = itemPayloadSchema.safeParse({
      ...validPayload,
      images: [{ url: "https://evil.com/image.jpg", contentType: "image/jpeg", sizeBytes: 2048 }],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects images without id", () => {
    const parsed = itemPayloadSchema.safeParse({
      ...validPayload,
      images: [{ contentType: "image/jpeg", sizeBytes: 1024 }],
    });

    expect(parsed.success).toBe(false);
  });

  it("limits listings to eight images", () => {
    const parsed = itemPayloadSchema.safeParse({
      ...validPayload,
      images: Array.from({ length: 9 }, (_, index) => ({
        id: `asset-${index}`,
      })),
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate media asset ids", () => {
    const parsed = itemPayloadSchema.safeParse({
      ...validPayload,
      images: [{ id: "asset-1" }, { id: "asset-1" }],
    });

    expect(parsed.success).toBe(false);
  });
});
