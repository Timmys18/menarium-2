import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://menarium.ru";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/profile/edit"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
