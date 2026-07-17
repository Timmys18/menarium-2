import { z } from "zod";

export const handoffModeLabels = {
  IN_PERSON: "Личная встреча",
  DELIVERY: "Доставка",
  ONLINE: "Онлайн",
} as const;

const revisionSchema = z.number().int().nonnegative();

export const handoffActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save"),
      mode: z.enum(["IN_PERSON", "DELIVERY", "ONLINE"]),
      scheduledAt: z.string().datetime({ offset: true }),
      details: z.string().trim().min(3).max(500),
      revision: revisionSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("confirm"),
      revision: revisionSchema,
    })
    .strict(),
]);

export function isHandoffScheduleAllowed(scheduledAt: Date, now = new Date()) {
  const earliest = now.getTime() - 15 * 60 * 1000;
  const latest = now.getTime() + 180 * 24 * 60 * 60 * 1000;
  return scheduledAt.getTime() >= earliest && scheduledAt.getTime() <= latest;
}
