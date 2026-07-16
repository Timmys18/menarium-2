"use client";

import type { ClientProductEvent } from "@/features/analytics/events";

export async function trackClientProductEvent(event: ClientProductEvent) {
  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...event, eventId: crypto.randomUUID() }),
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    // Analytics never interrupts a product action.
  }
}
