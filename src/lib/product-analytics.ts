import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaError } from "@/lib/transactions";

export const SERVER_PRODUCT_EVENT_NAMES = [
  "user_registered",
  "email_verified",
  "login_succeeded",
  "item_created",
  "swipe_passed",
  "swap_proposed",
  "swap_accepted",
  "swap_declined",
  "swap_revoked",
  "swap_completion_confirmed",
  "swap_completed",
  "swap_cancelled",
] as const;

export type ServerProductEventName = (typeof SERVER_PRODUCT_EVENT_NAMES)[number];
export type ProductEventName =
  | ServerProductEventName
  | "page_view"
  | "registration_started"
  | "item_creation_started"
  | "exchange_proposal_started";

type ProductEventProperty = string | number | boolean | null;

type TrackProductEventInput = {
  name: ProductEventName;
  actorId?: string | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  entityType?: "User" | "Item" | "SwapRequest";
  entityId?: string | null;
  path?: string | null;
  properties?: Record<string, ProductEventProperty>;
  dedupeKey?: string | null;
};

export function isProductAnalyticsEnabled() {
  return process.env.PRODUCT_ANALYTICS_ENABLED === "true";
}

export function sanitizeProductEventProperties(
  properties: Record<string, ProductEventProperty> | undefined,
): Prisma.InputJsonObject | undefined {
  if (!properties) return undefined;

  const safeEntries = Object.entries(properties)
    .filter(([key]) => /^[a-z][a-z0-9_]{0,39}$/.test(key))
    .slice(0, 12)
    .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 80) : value]);

  return safeEntries.length ? Object.fromEntries(safeEntries) : undefined;
}

export async function trackProductEvent(input: TrackProductEventInput) {
  if (!isProductAnalyticsEnabled()) return;

  try {
    await prisma.productEvent.create({
      data: {
        name: input.name,
        actorId: input.actorId ?? null,
        anonymousId: input.anonymousId ?? null,
        sessionId: input.sessionId ?? null,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        path: input.path ?? null,
        properties: sanitizeProductEventProperties(input.properties),
        dedupeKey: input.dedupeKey ?? null,
      },
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) return;

    // Product actions must remain available even when observability is degraded.
    console.error(`[product-analytics] Failed to record ${input.name}:`, error);
  }
}
