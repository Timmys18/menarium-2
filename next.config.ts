import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const storagePublicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
const storageHost = storagePublicBaseUrl?.startsWith("http")
  ? new URL(storagePublicBaseUrl).hostname
  : undefined;

const securityHeaders = [
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
  experimental: {
    viewTransition: true,
  },
  // Playwright uses its own build directory, so local visual review and E2E never fight over .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  // Keep local visual reviews free from the framework's floating development badge.
  devIndicators: false,
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
