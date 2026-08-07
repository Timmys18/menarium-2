import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/new",
  "/my-items",
  "/profile/edit",
  "/profile/chats",
  "/exchange",
  "/notifications",
  "/admin",
  "/swipe",
];

function getOrigin(value: string | undefined) {
  if (!value?.startsWith("http")) return undefined;

  return new URL(value).origin;
}

function createContentSecurityPolicy(nonce: string) {
  const storageOrigin = getOrigin(process.env.STORAGE_PUBLIC_BASE_URL);
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
  const sentryOrigin = getOrigin(sentryDsn);
  const enforceHttps = new Set(["staging", "production"]).has(process.env.APP_ENVIRONMENT ?? "");

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
    }`,
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' blob: data: https://storage.yandexcloud.net${storageOrigin ? ` ${storageOrigin}` : ""}`,
    "font-src 'self' data:",
    `connect-src 'self'${storageOrigin ? ` ${storageOrigin}` : ""}${sentryOrigin ? ` ${sentryOrigin}` : ""}`,
    `media-src 'self' blob:${storageOrigin ? ` ${storageOrigin}` : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(enforceHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function nextResponseWithSecurityHeaders(req: NextRequest, contentSecurityPolicy: string, nonce: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);

  const isProtected =
    protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    /^\/item\/[^/]+\/edit$/.test(pathname);

  if (!isProtected) return nextResponseWithSecurityHeaders(req, contentSecurityPolicy, nonce);

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return nextResponseWithSecurityHeaders(req, contentSecurityPolicy, nonce);

  const loginUrl = new URL("/auth/login", req.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
  const response = NextResponse.redirect(loginUrl);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
