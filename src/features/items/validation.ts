import { ItemType } from "@prisma/client";
import { z } from "zod";

export const itemPayloadSchema = z.object({
  title: z.string().trim().min(2).max(120),
  type: z.nativeEnum(ItemType).default(ItemType.THING),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(4000),
  city: z.string().trim().min(2).max(80),
  isOnline: z.boolean().default(false),
  desired: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  acceptsAnything: z.boolean().default(false),
  extraOfferText: z.string().trim().max(1000).optional().or(z.literal("")),
  // Изображения принимаются только по id уже загруженного через /api/media
  // ассета (принадлежащего пользователю). Произвольные внешние URL запрещены —
  // иначе можно подставить ссылку на чужой/вредоносный контент.
  images: z
    .array(
      z.object({
        id: z.string().min(1),
      }),
    )
    .max(8)
    .refine((images) => new Set(images.map((image) => image.id)).size === images.length, {
      message: "Изображения не должны повторяться",
    })
    .default([]),
});
