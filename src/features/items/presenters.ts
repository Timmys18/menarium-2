import type { PublicItem } from "@/features/items/serializers";

export type ItemCardView = {
  id: string;
  title: string;
  category: string;
  image: string;
  wanted: string;
  city: string;
  likes?: number;
  trending?: boolean;
};

export function itemWantedLabel(item: Pick<PublicItem, "desired" | "acceptsAnything" | "extraOfferText">) {
  if (item.desired.length > 0) return item.desired.join(", ");
  if (item.extraOfferText) return item.extraOfferText;
  if (item.acceptsAnything) return "Открыт к предложениям";
  return "Рассмотрит хороший обмен";
}

export function toItemCardView(item: PublicItem): ItemCardView {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    image: item.images[0]?.url ?? "/menarium-placeholder.svg",
    wanted: itemWantedLabel(item),
    city: item.city,
    trending: item.acceptsAnything,
  };
}
