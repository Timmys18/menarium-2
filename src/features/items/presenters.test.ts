import { describe, expect, it } from "vitest";
import { itemWantedLabel, toItemCardView } from "./presenters";
import type { PublicItem } from "./serializers";

const item: PublicItem = {
  id: "item-1",
  title: "Sony WH-1000XM5",
  type: "THING",
  category: "Техника",
  description: "Описание объявления",
  city: "Москва",
  isOnline: false,
  status: "ACTIVE",
  desired: ["Клавиатура", "AirPods"],
  acceptsAnything: false,
  extraOfferText: null,
  createdAt: new Date("2026-01-01").toISOString(),
  updatedAt: new Date("2026-01-01").toISOString(),
  owner: { id: "user-1", name: "Мария", city: "Москва", image: null },
  images: [{ id: "image-1", url: "https://example.com/image.jpg", contentType: "image/jpeg" }],
};

describe("item presenters", () => {
  it("prefers explicit desired labels", () => {
    expect(itemWantedLabel(item)).toBe("Клавиатура, AirPods");
  });

  it("falls back to extra offer text", () => {
    expect(itemWantedLabel({ desired: [], acceptsAnything: false, extraOfferText: "Рассмотрю фотоуслуги" })).toBe(
      "Рассмотрю фотоуслуги",
    );
  });

  it("falls back to open offer label", () => {
    expect(itemWantedLabel({ desired: [], acceptsAnything: true, extraOfferText: null })).toBe("Открыт к предложениям");
  });

  it("maps public items to card view", () => {
    expect(toItemCardView(item)).toMatchObject({
      id: "item-1",
      title: "Sony WH-1000XM5",
      category: "Техника",
      image: "https://example.com/image.jpg",
      wanted: "Клавиатура, AirPods",
      city: "Москва",
      type: "THING",
      isOnline: false,
      flexible: false,
    });
  });

  it("uses branded placeholder when item has no images", () => {
    expect(toItemCardView({ ...item, images: [] }).image).toBe("/menarium-placeholder.svg");
  });
});
