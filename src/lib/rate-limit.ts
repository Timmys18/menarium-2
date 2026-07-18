import { getRedis } from "@/lib/redis";
import { reportError } from "@/lib/logger";

type RateLimitResult =
  | { ok: true }
  | { ok: false; status: 429 | 503; error: string; retryAfterSec?: number };

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
  const fullKey = `rate:${key}`;

  try {
    const redis = getRedis();
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
  } catch (error) {
    reportError("rate_limit.redis_failed", error);
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        status: 503,
        error: "Сервис временно недоступен. Повторите попытку через минуту.",
        retryAfterSec: 60,
      };
    }
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

export async function checkMediaUploadRateLimit(userId: string) {
  const burst = await checkRateLimit(`media:${userId}:minute`, {
    limit: 16,
    windowSec: 60,
    error: "Слишком много загрузок. Подождите минуту и попробуйте снова.",
  });
  if (!burst.ok) return burst;

  return checkRateLimit(`media:${userId}:day`, {
    limit: 120,
    windowSec: 24 * 60 * 60,
    error: "Дневной лимит загрузок исчерпан. Попробуйте завтра.",
  });
}

export function checkMediaDeleteRateLimit(userId: string) {
  return checkRateLimit(`media-delete:${userId}:minute`, {
    limit: 30,
    windowSec: 60,
    error: "Слишком много операций с файлами. Подождите минуту.",
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

export async function resetLoginRateLimit(email: string, ip: string) {
  const fullKey = `rate:login:${email}:${ip}`;
  devMemory.delete(fullKey);

  try {
    const redis = getRedis();
    if (redis) await redis.del(fullKey);
  } catch (error) {
    // A cleanup failure must not turn valid credentials into a failed login.
    reportError("rate_limit.login_reset_failed", error);
  }
}

/** Лимит на регистрацию: защита от массового создания аккаунтов (по IP). */
export function checkRegisterRateLimit(ip: string) {
  return checkRateLimit(`register:${ip}`, {
    limit: 5,
    windowSec: 60 * 60,
    error: "Слишком много регистраций с этого адреса. Попробуйте позже.",
  });
}
