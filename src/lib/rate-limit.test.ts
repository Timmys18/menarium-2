import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkLoginRateLimit, resetLoginRateLimit } from "./rate-limit";

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
});
