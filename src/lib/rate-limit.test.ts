import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  checkItemCreationRateLimit,
  checkLoginRateLimit,
  getClientIp,
  isIpAddress,
  resetLoginRateLimit,
} from "./rate-limit";

describe("getClientIp", () => {
  afterEach(() => {
    delete process.env.TRUSTED_PROXY_HOPS;
  });

  function headers(values: Record<string, string>) {
    return new Headers(values);
  }

  it("ignores the client-controlled left side of X-Forwarded-For", () => {
    // Клиент прислал свой заголовок, Nginx дописал реальный адрес справа.
    // Взять левый элемент значило бы отдать выбор ключа лимита атакующему.
    const ip = getClientIp(headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.7" }));
    expect(ip).toBe("198.51.100.7");
  });

  it("keeps a single spoofed entry from becoming the client address", () => {
    const first = getClientIp(headers({ "x-forwarded-for": "9.9.9.9", "x-real-ip": "198.51.100.7" }));
    const second = getClientIp(headers({ "x-forwarded-for": "8.8.8.8", "x-real-ip": "198.51.100.7" }));
    // Оба запроса пришли с одного адреса и обязаны попасть в один ключ.
    expect(first).toBe(second);
  });

  it("honours a configured number of trusted proxies", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    const ip = getClientIp(headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.7, 10.0.0.1" }));
    expect(ip).toBe("198.51.100.7");
  });

  it("falls back to X-Real-IP, which the client cannot set through the proxy", () => {
    expect(getClientIp(headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("rejects values that are not addresses instead of trusting them as keys", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "not-an-ip" }))).toBe("unknown");
    expect(getClientIp(headers({}))).toBe("unknown");
  });

  it("accepts IPv6", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });
});

describe("isIpAddress", () => {
  it("accepts real addresses", () => {
    expect(isIpAddress("192.168.0.1")).toBe(true);
    expect(isIpAddress("::1")).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(isIpAddress("999.1.1.1")).toBe(false);
    expect(isIpAddress("example.com")).toBe(false);
    expect(isIpAddress("unknown")).toBe(false);
  });
});

describe("login rate limit", () => {
  const originalRedisUrl = process.env.REDIS_URL;

  beforeAll(() => {
    delete process.env.REDIS_URL;
  });

  afterAll(() => {
    if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl;
  });

  it("clears the bucket after a successful login", async () => {
    const email = `rate-${Date.now()}@example.test`;
    const ip = "203.0.113.10";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await checkLoginRateLimit(email, ip)).ok).toBe(true);
    }
    expect((await checkLoginRateLimit(email, ip)).ok).toBe(false);

    await resetLoginRateLimit(email, ip);

    expect((await checkLoginRateLimit(email, ip)).ok).toBe(true);
  });

  it("gives unverified accounts a lower publishing allowance", async () => {
    const userId = `unverified-${Date.now()}`;
    vi.useFakeTimers();
    try {
      expect((await checkItemCreationRateLimit(userId, false)).ok).toBe(true);
      vi.advanceTimersByTime(3_100);
      expect((await checkItemCreationRateLimit(userId, false)).ok).toBe(true);
      vi.advanceTimersByTime(3_100);
      expect((await checkItemCreationRateLimit(userId, false)).ok).toBe(true);
      vi.advanceTimersByTime(3_100);

      const limited = await checkItemCreationRateLimit(userId, false);
      expect(limited.ok).toBe(false);
      if (!limited.ok) expect(limited.status).toBe(429);
    } finally {
      vi.useRealTimers();
    }
  });
});
