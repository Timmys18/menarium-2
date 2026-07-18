import { NextResponse } from "next/server";

import { API_VERSION } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

const HEALTH_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};
const DEPENDENCY_TIMEOUT_MS = 5_000;

type HealthCheckStatus = "ok" | "error" | "skipped" | "unknown";

function serviceDetails() {
  return {
    service: "menarium-2",
    version: API_VERSION,
    release: process.env.APP_RELEASE ?? "development",
    time: new Date().toISOString(),
  };
}

export async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createLivenessResponse() {
  return NextResponse.json(
    {
      ok: true,
      healthy: true,
      ...serviceDetails(),
    },
    { headers: HEALTH_HEADERS },
  );
}

export async function createReadinessResponse() {
  const checks: Record<"database" | "redis", HealthCheckStatus> = {
    database: "unknown",
    redis: "unknown",
  };

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DEPENDENCY_TIMEOUT_MS, "database health check");
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    const redis = getRedis();
    if (redis) {
      await withTimeout(redis.ping(), DEPENDENCY_TIMEOUT_MS, "redis health check");
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
      ...serviceDetails(),
      checks,
    },
    { status: ok ? 200 : 503, headers: HEALTH_HEADERS },
  );
}
