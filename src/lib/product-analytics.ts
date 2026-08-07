import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/logger";

export const SERVER_PRODUCT_EVENT_NAMES = [
  "user_registered",
  "email_verified",
  "login_succeeded",
  "item_created",
  "item_favorited",
  "item_unfavorited",
  "swipe_passed",
  "swipe_pass_undone",
  "swap_proposed",
  "swap_accepted",
  "swap_declined",
  "swap_revoked",
  "swap_completion_confirmed",
  "swap_completed",
  "swap_cancelled",
  "review_submitted",
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

type QueuedEvent = Prisma.ProductEventCreateManyInput;

const globalAnalytics = globalThis as unknown as {
  queue?: QueuedEvent[];
  flushTimer?: ReturnType<typeof setTimeout>;
  flushPromise?: Promise<void>;
};

function eventQueue() {
  if (!globalAnalytics.queue) globalAnalytics.queue = [];
  return globalAnalytics.queue;
}

async function flushProductEvents() {
  if (globalAnalytics.flushPromise) return globalAnalytics.flushPromise;
  const batch = eventQueue().splice(0, 100);
  if (!batch.length) return;

  globalAnalytics.flushPromise = prisma.productEvent
    .createMany({ data: batch, skipDuplicates: true })
    .then(() => undefined)
    .catch((error) => reportError("product_analytics.record_failed", error, { batchSize: batch.length }))
    .finally(() => {
      globalAnalytics.flushPromise = undefined;
      if (eventQueue().length) void flushProductEvents();
    });
  return globalAnalytics.flushPromise;
}

function scheduleProductEventFlush() {
  if (globalAnalytics.flushTimer) return;
  globalAnalytics.flushTimer = setTimeout(() => {
    globalAnalytics.flushTimer = undefined;
    void flushProductEvents();
  }, 2_000);
  globalAnalytics.flushTimer.unref?.();
}

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

export function trackProductEvent(input: TrackProductEventInput) {
  if (!isProductAnalyticsEnabled()) return;

  eventQueue().push({
    name: input.name,
    actorId: input.actorId ?? null,
    anonymousId: input.anonymousId ?? null,
    sessionId: input.sessionId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    path: input.path ?? null,
    properties: sanitizeProductEventProperties(input.properties),
    dedupeKey: input.dedupeKey ?? null,
  });
  if (eventQueue().length >= 100) void flushProductEvents();
  else scheduleProductEventFlush();
}
