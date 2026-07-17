import type { ItemCardView } from "@/features/items/presenters";
import { sampleItems } from "@/features/items/sample-data";

export function getPreviewItemCards(): ItemCardView[] {
  return sampleItems.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    image: item.image,
    wanted: item.wanted,
    city: item.city,
    type: "THING",
    isOnline: false,
    likes: item.likes,
    flexible: item.trending,
  }));
}
