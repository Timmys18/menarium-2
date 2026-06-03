import type { NextConfig } from "next";

const storagePublicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
const storageHost = storagePublicBaseUrl?.startsWith("http")
  ? new URL(storagePublicBaseUrl).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "storage.yandexcloud.net" },
      ...(storageHost ? [{ protocol: "https" as const, hostname: storageHost }] : []),
    ],
  },
};

export default nextConfig;
