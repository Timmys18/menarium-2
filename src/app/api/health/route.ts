import { NextResponse } from "next/server";
import { API_VERSION } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export async function GET() {
  const checks = {
    database: "unknown",
    redis: "unknown",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    const redis = getRedis();
    if (redis) {
      await redis.ping();
      checks.redis = "ok";
    } else {
      checks.redis = "skipped";
    }
  } catch {
    checks.redis = "error";
  }

  const ok =
    checks.database === "ok" &&
    (checks.redis === "ok" || (checks.redis === "skipped" && process.env.NODE_ENV !== "production"));

  return NextResponse.json(
    {
      ok,
      healthy: ok,
      service: "menarium-2",
      version: API_VERSION,
      checks,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
