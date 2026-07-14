import { EventEmitter } from "node:events";
import type Redis from "ioredis";
import { getRedis } from "@/lib/redis";

export type RealtimeEvent = {
  type: "notification" | "swap" | "deal-message" | "item-message" | "counts";
  entityId?: string;
  occurredAt: string;
};

type Listener = (event: RealtimeEvent) => void;

const globalRealtime = globalThis as unknown as {
  realtimeEmitter?: EventEmitter;
};

function emitter() {
  if (!globalRealtime.realtimeEmitter) {
    globalRealtime.realtimeEmitter = new EventEmitter();
    globalRealtime.realtimeEmitter.setMaxListeners(500);
  }
  return globalRealtime.realtimeEmitter;
}

function userChannel(userId: string) {
  return `menarium:realtime:user:${userId}`;
}

export async function publishUserEvent(
  userId: string,
  event: Omit<RealtimeEvent, "occurredAt">,
) {
  const payload: RealtimeEvent = { ...event, occurredAt: new Date().toISOString() };
  const redis = getRedis();

  if (redis) {
    await redis.publish(userChannel(userId), JSON.stringify(payload));
    return;
  }

  emitter().emit(userChannel(userId), payload);
}

export async function publishUserEvents(
  userIds: string[],
  event: Omit<RealtimeEvent, "occurredAt">,
) {
  await Promise.allSettled([...new Set(userIds)].map((userId) => publishUserEvent(userId, event)));
}

export async function subscribeToUserEvents(userId: string, listener: Listener) {
  const redis = getRedis();
  const channel = userChannel(userId);

  if (!redis) {
    emitter().on(channel, listener);
    return async () => {
      emitter().off(channel, listener);
    };
  }

  const subscriber: Redis = redis.duplicate({
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
  const onMessage = (incomingChannel: string, message: string) => {
    if (incomingChannel !== channel) return;
    try {
      listener(JSON.parse(message) as RealtimeEvent);
    } catch {
      // Ignore malformed pub/sub payloads; the connection remains healthy.
    }
  };

  subscriber.on("message", onMessage);
  await subscriber.subscribe(channel);

  return async () => {
    subscriber.off("message", onMessage);
    await subscriber.unsubscribe(channel).catch(() => undefined);
    await subscriber.quit().catch(() => undefined);
  };
}
