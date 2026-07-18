import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "https://menarium.ru";
  if (process.env.APP_ENVIRONMENT !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/profile/edit"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
