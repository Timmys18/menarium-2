import type { MetadataRoute } from "next";
import { ItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://menarium.ru";
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/swipe`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/auth/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/auth/register`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.2 },
  ];

  try {
    const items = await prisma.item.findMany({
      where: { status: ItemStatus.ACTIVE },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    return [
      ...staticRoutes,
      ...items.map((item) => ({
        url: `${base}/item/${item.id}`,
        lastModified: item.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
