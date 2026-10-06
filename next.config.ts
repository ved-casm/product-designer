import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // ~10 KB of CSS: shipping it inside the HTML removes a render-blocking request for first-time visitors.
    inlineCss: true,
  },
  async headers() {
    return [
      {
        // Fonts never change under the same name.
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Media and the resume can be replaced in place, so cache for a week and refresh in the background.
        source: "/:dir(media|resume)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
