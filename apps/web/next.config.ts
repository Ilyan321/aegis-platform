import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compress responses — directly improves LCP (Google ranking signal)
  compress: true,

  // Strong HTTP cache for static assets (improves repeat-visit performance)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Tell Google this is the definitive version
          { key: "X-Robots-Tag", value: "index, follow" },
        ],
      },
      {
        // Immutable cache for hashed Next.js static chunks
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache public assets (fonts, images, icons) for 7 days
        source: "/(.*)\\.(png|jpg|jpeg|gif|webp|svg|ico|woff2|woff|ttf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
