import { ItemType } from "@prisma/client";
import { z } from "zod";
import { findCategory } from "@/features/taxonomy/catalog";
import { getCity } from "@/features/locations/cities";

export const itemPayloadSchema = z.object({
  title: z.string().trim().min(2).max(120),
  type: z.nativeEnum(ItemType).default(ItemType.THING),
  categoryId: z.string().trim().min(3).max(120).refine((value) => Boolean(findCategory(value)), "Выберите категорию из списка."),
  description: z.string().trim().min(10).max(4000),
  cityId: z.string().trim().min(2).max(180).refine((value) => Boolean(getCity(value)), "Выберите город из списка."),
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
