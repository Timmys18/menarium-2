import { z } from "zod";

export const createReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z
      .string()
      .trim()
      .max(600)
      .optional()
      .transform((value) => value || undefined),
  })
  .strict();
