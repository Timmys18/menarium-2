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
  images: z
    .array(
      z.object({
        id: z.string().optional(),
        url: z.string().refine((value) => value.startsWith("/") || z.string().url().safeParse(value).success, {
          message: "Image URL must be absolute or app-relative",
        }),
        contentType: z.string().min(3).max(120).default("image/jpeg"),
        sizeBytes: z.number().int().positive().max(10 * 1024 * 1024).default(1),
      }),
    )
    .max(8)
    .default([]),
});
