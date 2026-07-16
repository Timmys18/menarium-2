import { createHmac, randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { clientProductEventSchema } from "@/features/analytics/events";
import { authOptions } from "@/lib/auth";
import { isProductAnalyticsEnabled, trackProductEvent } from "@/lib/product-analytics";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const VISITOR_COOKIE = "menarium_visitor";
const SESSION_COOKIE = "menarium_analytics_session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validCookieId(value: string | undefined) {
  return value && UUID_PATTERN.test(value) ? value : randomUUID();
}

function rateLimitIdentity(req: NextRequest) {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "local-analytics-rate-limit")
    .update(getClientIp(req.headers))
    .digest("hex")
    .slice(0, 24);
}

export async function POST(req: NextRequest) {
  if (!isProductAnalyticsEnabled()) return new NextResponse(null, { status: 204 });

  const rate = await checkRateLimit(`analytics:${rateLimitIdentity(req)}`, {
    limit: 120,
    windowSec: 60,
    error: "Too many analytics events",
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: rate.error },
      { status: rate.status, headers: rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : undefined },
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 2_048) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  const rawBody = await req.text();
  if (rawBody.length > 2_048) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = clientProductEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event" }, { status: 400 });

  const anonymousId = validCookieId(req.cookies.get(VISITOR_COOKIE)?.value);
  const sessionId = validCookieId(req.cookies.get(SESSION_COOKIE)?.value);
  const session = await getServerSession(authOptions);
  const { eventId, ...event } = parsed.data;

  await trackProductEvent({
    ...event,
    actorId: session?.user?.id,
    anonymousId,
    sessionId,
    dedupeKey: `client:${eventId}`,
  });

  const response = NextResponse.json({ ok: true }, { status: 202 });
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(VISITOR_COOKIE, anonymousId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 180 * 24 * 60 * 60,
  });
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 30 * 60,
  });

  return response;
}
