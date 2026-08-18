import { getRedis } from "@/lib/redis";
import { reportError } from "@/lib/logger";

type RateLimitResult =
  | { ok: true }
  | { ok: false; status: 429 | 503; error: string; retryAfterSec?: number };

const devMemory = new Map<string, number[]>();

export async function clearRateLimitsForE2e() {
  if (process.env.E2E_TEST_MODE !== "true") {
    throw new Error("Rate limit reset is only available in the E2E test process");
  }

  devMemory.clear();

  const redis = getRedis();
  if (!redis) return;

  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "rate:*", "COUNT", 200);
    cursor = nextCursor;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== "0");
}

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
  // Browser scenarios use a dedicated server and must not inherit counters from a previous test.
  if (process.env.E2E_TEST_MODE === "true") return { ok: true };

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
    limit: 8,
    windowSec: 10,
    error: "Сообщения отправляются слишком быстро. Сделайте короткую паузу.",
  });

  if (!shortWindow.ok) return shortWindow;

  return checkRateLimit(`message:${userId}:day`, {
    limit: 500,
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

type PublishingLimits = {
  verified: { perHour: number; perDay: number };
  unverified: { perHour: number; perDay: number };
};

async function checkPublishingRateLimit(
  userId: string,
  action: string,
  emailVerified: boolean,
  limits: PublishingLimits,
): Promise<RateLimitResult> {
  const immediate = await checkActionRateLimit(userId, `${action}:immediate`);
  if (!immediate.ok) return immediate;

  const threshold = emailVerified ? limits.verified : limits.unverified;
  const hourly = await checkRateLimit(`publishing:${userId}:${action}:hour`, {
    limit: threshold.perHour,
    windowSec: 60 * 60,
    error: "Слишком много действий за последний час. Попробуйте позже.",
  });
  if (!hourly.ok) return hourly;

  return checkRateLimit(`publishing:${userId}:${action}:day`, {
    limit: threshold.perDay,
    windowSec: 24 * 60 * 60,
    error: "Дневной лимит исчерпан. Попробуйте завтра.",
  });
}

export function checkItemCreationRateLimit(userId: string, emailVerified: boolean) {
  return checkPublishingRateLimit(userId, "items:create", emailVerified, {
    verified: { perHour: 10, perDay: 30 },
    unverified: { perHour: 3, perDay: 8 },
  });
}

export function checkExchangeCreationRateLimit(userId: string, emailVerified: boolean) {
  return checkPublishingRateLimit(userId, "exchange:create", emailVerified, {
    verified: { perHour: 30, perDay: 100 },
    unverified: { perHour: 10, perDay: 30 },
  });
}

export function checkReportCreationRateLimit(userId: string, emailVerified: boolean) {
  return checkPublishingRateLimit(userId, "reports:create", emailVerified, {
    verified: { perHour: 10, perDay: 20 },
    unverified: { perHour: 4, perDay: 10 },
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

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/**
 * Отбраковывает мусор вроде `unknown` или доменного имени: в ключ лимита должен
 * попадать только реальный адрес, иначе один клиент получает бесконечное число
 * различных «адресов» и лимит перестаёт что-либо ограничивать.
 */
export function isIpAddress(value: string): boolean {
  const withoutPort = value.startsWith("[") ? value.slice(1, value.indexOf("]")) : value;
  const candidate = withoutPort.split("%")[0]!;
  if (IPV4.test(candidate)) {
    return candidate.split(".").every((part) => Number(part) <= 255);
  }
  // IPv6 — hex-группы через двоеточие, возможен IPv4-хвост.
  return candidate.includes(":") && /^[0-9a-f:.]+$/i.test(candidate);
}

function trustedProxyHops() {
  const configured = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  if (!Number.isInteger(configured) || configured < 1) return 1;
  return configured;
}

/**
 * Достаёт IP клиента из заголовков прокси.
 *
 * `X-Forwarded-For` — список, который клиент вправе начать сам: прокси лишь
 * дописывает реальный адрес к тому, что пришло. Поэтому левая часть списка
 * подконтрольна атакующему, и брать значение оттуда нельзя — иначе все лимиты
 * по IP обходятся одним заголовком.
 *
 * Доверять можно только элементам, которые дописали наши собственные прокси.
 * `TRUSTED_PROXY_HOPS` задаёт их число (по умолчанию один — Nginx перед
 * приложением): отсчитываем это число справа и берём первый адрес, который наш
 * прокси наблюдал своими глазами.
 */
export function getClientIp(headers: Headers): string {
  // `X-Real-IP` наш Nginx выставляет из $remote_addr и всегда перезаписывает,
  // поэтому клиент его подделать не может. Это самый надёжный источник, и он
  // идёт первым: список X-Forwarded-For из одного элемента невозможно отличить
  // от подделки, если прокси его не перезаписал.
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && isIpAddress(realIp)) return realIp;

  const forwarded = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (forwarded?.length) {
    const index = Math.max(0, forwarded.length - trustedProxyHops());
    const candidate = forwarded[index];
    if (candidate && isIpAddress(candidate)) return candidate;
  }

  return "unknown";
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
