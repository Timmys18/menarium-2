import { getRedis } from "@/lib/redis";

type RateLimitResult =
  | { ok: true }
  | { ok: false; status: 429; error: string; retryAfterSec?: number };

const devMemory = new Map<string, number[]>();

function prune(values: number[], windowMs: number) {
  const cutoff = Date.now() - windowMs;
  return values.filter((value) => value > cutoff);
}

export async function checkRateLimit(
  key: string,
  options: {
    limit: number;
    windowSec: number;
    error: string;
  },
): Promise<RateLimitResult> {
  const redis = getRedis();
  const fullKey = `rate:${key}`;

  if (!redis) {
    const current = prune(devMemory.get(fullKey) ?? [], options.windowSec * 1000);
    if (current.length >= options.limit) {
      return { ok: false, status: 429, error: options.error, retryAfterSec: options.windowSec };
    }
    current.push(Date.now());
    devMemory.set(fullKey, current);
    return { ok: true };
  }

  const count = await redis.incr(fullKey);
  if (count === 1) {
    await redis.expire(fullKey, options.windowSec);
  }

  if (count > options.limit) {
    const ttl = await redis.ttl(fullKey);
    return {
      ok: false,
      status: 429,
      error: options.error,
      retryAfterSec: ttl > 0 ? ttl : options.windowSec,
    };
  }

  return { ok: true };
}

export async function checkMessageRateLimit(userId: string) {
  const shortWindow = await checkRateLimit(`message:${userId}:short`, {
    limit: 1,
    windowSec: 3,
    error: "Слишком частые сообщения. Подождите несколько секунд.",
  });

  if (!shortWindow.ok) return shortWindow;

  return checkRateLimit(`message:${userId}:day`, {
    limit: 50,
    windowSec: 24 * 60 * 60,
    error: "Превышен лимит сообщений за сутки. Попробуйте завтра.",
  });
}

export function checkActionRateLimit(userId: string, action: string) {
  return checkRateLimit(`action:${userId}:${action}`, {
    limit: 1,
    windowSec: 3,
    error: "Слишком много запросов. Попробуйте чуть позже.",
  });
}
