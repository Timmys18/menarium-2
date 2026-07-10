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

  try {
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
  } catch (error) {
    // Если Redis временно недоступен в рантайме — не роняем запрос 500-й ошибкой
    // и не блокируем пользователей. Пропускаем (fail-open), лишь логируя проблему.
    console.error("[rate-limit] Redis error, failing open:", error);
    return { ok: true };
  }
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

/** Достаёт IP клиента из заголовков прокси (Nginx ставит x-forwarded-for). */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Лимит на попытки входа: защита от перебора паролей (по email + IP). */
export function checkLoginRateLimit(email: string, ip: string) {
  return checkRateLimit(`login:${email}:${ip}`, {
    limit: 10,
    windowSec: 10 * 60,
    error: "Слишком много попыток входа. Попробуйте через несколько минут.",
  });
}

/** Лимит на регистрацию: защита от массового создания аккаунтов (по IP). */
export function checkRegisterRateLimit(ip: string) {
  return checkRateLimit(`register:${ip}`, {
    limit: 5,
    windowSec: 60 * 60,
    error: "Слишком много регистраций с этого адреса. Попробуйте позже.",
  });
}
