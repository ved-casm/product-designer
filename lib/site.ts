/**
 * Canonical origin for absolute URLs (share previews, sitemap, robots, structured data).
 * Set NEXT_PUBLIC_SITE_URL once the site has its own domain; on Vercel the production
 * URL is picked up automatically. See .env.example.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Vedank Gaur";

/** Absolute URL for a site path. */
export const abs = (path = "/") => `${SITE_URL}${path === "/" ? "" : path}`;

/** Serialises structured data for a <script type="application/ld+json"> without breaking out of the tag. */
export const ldJson = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
