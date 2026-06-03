import type { Item, MediaAsset, User } from "@prisma/client";

export type PublicItem = {
  id: string;
  title: string;
  type: string;
  category: string;
  description: string;
  city: string;
  isOnline: boolean;
  status: string;
  desired: string[];
  acceptsAnything: boolean;
  extraOfferText: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    city: string | null;
    image: string | null;
  } | null;
  images: {
    id: string;
    url: string;
    contentType: string;
  }[];
};

export function serializeItem(
  item: Item & {
    owner?: Pick<User, "id" | "name" | "city" | "image"> | null;
    images?: Pick<MediaAsset, "id" | "url" | "contentType">[];
  },
): PublicItem {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    category: item.category,
    description: item.description,
    city: item.city,
    isOnline: item.isOnline,
    status: item.status,
    desired: item.desired,
    acceptsAnything: item.acceptsAnything,
    extraOfferText: item.extraOfferText,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    owner: item.owner
      ? {
          id: item.owner.id,
          name: item.owner.name,
          city: item.owner.city,
          image: item.owner.image,
        }
      : null,
    images:
      item.images?.map((image) => ({
        id: image.id,
        url: image.url,
        contentType: image.contentType,
      })) ?? [],
  };
}
