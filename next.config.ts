import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const storagePublicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
const storageHost = storagePublicBaseUrl?.startsWith("http")
  ? new URL(storagePublicBaseUrl).hostname
  : undefined;
const storageOrigin = storagePublicBaseUrl?.startsWith("http")
  ? new URL(storagePublicBaseUrl).origin
  : undefined;
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
const sentryOrigin = sentryDsn?.startsWith("http") ? new URL(sentryDsn).origin : undefined;
const isDevelopment = process.env.NODE_ENV === "development";
const enforceHttps = new Set(["staging", "production"]).has(process.env.APP_ENVIRONMENT ?? "");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
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

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/login", destination: "/auth/login", permanent: true },
      { source: "/register", destination: "/auth/register", permanent: true },
      {
        source: "/forgot-password",
        destination: "/auth/forgot-password",
        permanent: true,
      },
    ];
  },
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      { protocol: "https", hostname: "storage.yandexcloud.net" },
      ...(storageHost ? [{ protocol: "https" as const, hostname: storageHost }] : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          ...(process.env.APP_ENVIRONMENT === "production"
            ? []
            : [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }]),
        ],
      },
    ];
  },
};

const sentryEnabled = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
      webpack: { treeshake: { removeDebugLogging: true } },
      widenClientFileUpload: false,
    })
  : nextConfig;
