import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export function getRedis() {
  const url = process.env.REDIS_URL;

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("REDIS_URL is required in production");
    }
    return null;
  }

  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
    });
  }

  return globalForRedis.redis;
}
