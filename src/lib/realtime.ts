import { EventEmitter } from "node:events";
import type Redis from "ioredis";
import { getRedis } from "@/lib/redis";

export type RealtimeEvent = {
  type:
    | "notification"
    | "swap"
    | "deal-message"
    | "item-message"
    | "counts"
    | "chat-read"
    | "chat-typing";
  entityId?: string;
  actorId?: string;
  state?: "active" | "idle";
  occurredAt: string;
};

type Listener = (event: RealtimeEvent) => void;

const globalRealtime = globalThis as unknown as {
  realtimeEmitter?: EventEmitter;
  redisSubscriber?: Redis;
  redisSubscriberReady?: Promise<void>;
  userListeners?: Map<string, Set<Listener>>;
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

function listenersForUsers() {
  if (!globalRealtime.userListeners) globalRealtime.userListeners = new Map();
  return globalRealtime.userListeners;
}

async function ensureSharedRedisSubscriber(redis: Redis) {
  if (globalRealtime.redisSubscriberReady) return globalRealtime.redisSubscriberReady;

  const subscriber = redis.duplicate({ maxRetriesPerRequest: null, enableReadyCheck: true });
  const ready: Promise<void> = subscriber
    .psubscribe("menarium:realtime:user:*")
    .then(() => undefined)
    .catch(async (error) => {
      globalRealtime.redisSubscriber = undefined;
      globalRealtime.redisSubscriberReady = undefined;
      await subscriber.quit().catch(() => undefined);
      throw error;
    });

  subscriber.on("pmessage", (_pattern, channel, message) => {
    const prefix = "menarium:realtime:user:";
    if (!channel.startsWith(prefix)) return;
    try {
      const event = JSON.parse(message) as RealtimeEvent;
      for (const listener of listenersForUsers().get(channel.slice(prefix.length)) ?? []) listener(event);
    } catch {
      // A malformed event must not close other users' live connections.
    }
  });

  globalRealtime.redisSubscriber = subscriber;
  globalRealtime.redisSubscriberReady = ready;
  return ready;
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

  await ensureSharedRedisSubscriber(redis);
  const listeners = listenersForUsers();
  const userListeners = listeners.get(userId) ?? new Set<Listener>();
  userListeners.add(listener);
  listeners.set(userId, userListeners);

  return async () => {
    const current = listeners.get(userId);
    current?.delete(listener);
    if (current?.size === 0) listeners.delete(userId);
  };
}
