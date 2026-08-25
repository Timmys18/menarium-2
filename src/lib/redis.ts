import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export function getRedis() {
  // Browser acceptance runs in one isolated application process. It uses the
  // in-memory realtime fallback so a missing local Redis daemon cannot create
  // console noise or mask a UI failure.
  if (process.env.E2E_TEST_MODE === "true") return null;

  const url = process.env.REDIS_URL;

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("REDIS_URL is required in production");
    }
    return null;
  }

  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(url, {
      // Redis backs protection and live updates, but it must never hold a page
      // render indefinitely when a proxy accepts TCP connections without
      // serving Redis commands. Callers can then apply their own safe fallback.
      connectTimeout: 1_500,
      commandTimeout: 1_500,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => (attempt < 2 ? 150 : null),
      enableReadyCheck: false,
    });
  }

  return globalForRedis.redis;
}
