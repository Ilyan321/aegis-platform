import type { MetadataRoute } from "next";

const SITE_URL = "https://aegis-platform.ilyankhan.tech";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/landing", "/login", "/signup"],
        disallow: [
          "/verify-email",
          "/reset-password",
          "/auth/",
          "/api/",
          "/_next/",
        ],
      },
      {
        // Block bandwidth-burning crawlers that don't convert to traffic
        userAgent: ["AhrefsBot", "SemrushBot"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
