import { z } from "zod";

const KNOWN_STATIC_PATHS = new Set([
  "/",
  "/admin",
  "/admin/analytics",
  "/auth/forgot-password",
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
  "/auth/verify-email",
  "/catalog",
  "/exchange",
  "/my-items",
  "/new",
  "/notifications",
  "/privacy",
  "/profile",
  "/profile/chats",
  "/profile/edit",
  "/profile/my-swaps",
  "/swaps",
  "/swipe",
  "/terms",
]);

const analyticsPathSchema = z.string().startsWith("/").max(80);
const eventIdSchema = z.uuid();

export const clientProductEventSchema = z.discriminatedUnion("name", [
  z.object({ name: z.literal("page_view"), path: analyticsPathSchema, eventId: eventIdSchema }).strict(),
  z
    .object({ name: z.literal("registration_started"), path: z.literal("/auth/register"), eventId: eventIdSchema })
    .strict(),
  z
    .object({ name: z.literal("item_creation_started"), path: z.literal("/new"), eventId: eventIdSchema })
    .strict(),
  z
    .object({
      name: z.literal("exchange_proposal_started"),
      path: z.union([z.literal("/item/[id]"), z.literal("/swipe")]),
      eventId: eventIdSchema,
    })
    .strict(),
]);

export type ClientProductEvent =
  | { name: "page_view"; path: string }
  | { name: "registration_started"; path: "/auth/register" }
  | { name: "item_creation_started"; path: "/new" }
  | { name: "exchange_proposal_started"; path: "/item/[id]" | "/swipe" };

export function normalizeAnalyticsPath(pathname: string | null | undefined) {
  if (!pathname?.startsWith("/")) return "/other";

  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (KNOWN_STATIC_PATHS.has(normalized)) return normalized;
  if (/^\/item\/[^/]+$/.test(normalized)) return "/item/[id]";
  if (/^\/item\/[^/]+\/edit$/.test(normalized)) return "/item/[id]/edit";
  if (/^\/user\/[^/]+$/.test(normalized)) return "/user/[id]";

  // Unknown dynamic segments are deliberately collapsed to avoid collecting user data in URLs.
  return "/other";
}
