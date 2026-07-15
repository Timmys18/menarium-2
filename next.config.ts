import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const storagePublicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
const storageHost = storagePublicBaseUrl?.startsWith("http")
  ? new URL(storagePublicBaseUrl).hostname
  : undefined;

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      { protocol: "https", hostname: "storage.yandexcloud.net" },
      ...(storageHost ? [{ protocol: "https" as const, hostname: storageHost }] : []),
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const sentryEnabled = Boolean(process.env.SENTRY_DSN);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
      webpack: { treeshake: { removeDebugLogging: true } },
      widenClientFileUpload: false,
    })
  : nextConfig;
