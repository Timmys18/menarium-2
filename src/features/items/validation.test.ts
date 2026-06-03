import { describe, expect, it } from "vitest";
import { itemPayloadSchema } from "./validation";

const validPayload = {
  title: "Sony WH-1000XM5",
  type: "THING",
  category: "Техника",
  description: "Наушники в отличном состоянии, полный комплект и аккуратное использование.",
  city: "Москва",
  isOnline: false,
  desired: ["Механическая клавиатура"],
  acceptsAnything: false,
  extraOfferText: "",
};

describe("itemPayloadSchema", () => {
  it("accepts app-relative dev upload image urls", () => {
    const parsed = itemPayloadSchema.safeParse({
      ...validPayload,
      images: [{ id: "asset-1", url: "/uploads/user/image.jpg", contentType: "image/jpeg", sizeBytes: 1024 }],
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts absolute production storage image urls", () => {
    const parsed = itemPayloadSchema.safeParse({
      ...validPayload,
      images: [{ url: "https://bucket.storage.yandexcloud.net/uploads/user/image.webp", contentType: "image/webp", sizeBytes: 2048 }],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid image urls", () => {
    const parsed = itemPayloadSchema.safeParse({
      ...validPayload,
      images: [{ url: "not-a-url", contentType: "image/jpeg", sizeBytes: 1024 }],
    });

    expect(parsed.success).toBe(false);
  });

  it("limits listings to eight images", () => {
    const parsed = itemPayloadSchema.safeParse({
      ...validPayload,
      images: Array.from({ length: 9 }, (_, index) => ({
        url: `/uploads/user/${index}.jpg`,
        contentType: "image/jpeg",
        sizeBytes: 1024,
      })),
    });

    expect(parsed.success).toBe(false);
  });
});
