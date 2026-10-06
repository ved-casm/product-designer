import type { MetadataRoute } from "next";
import { abs, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Everything is public; only Next's internal build output is kept out of the index.
    rules: { userAgent: "*", allow: "/", disallow: ["/_next/"] },
    sitemap: abs("/sitemap.xml"),
    host: SITE_URL,
  };
}
