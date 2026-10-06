import type { MetadataRoute } from "next";
import { PROJECTS } from "@/components/portfolio/content";
import { abs } from "@/lib/site";

// Built at deploy time, so lastModified is the date of the deploy that changed the content.
const BUILT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: abs("/"),
      lastModified: BUILT,
      changeFrequency: "monthly",
      priority: 1,
      images: [abs("/media/brand/vedank-portrait-square.webp"), abs("/opengraph-image")],
    },
    {
      url: abs("/work"),
      lastModified: BUILT,
      changeFrequency: "monthly",
      priority: 0.9,
      images: PROJECTS.map((p) => abs(p.image.replace(/\.avif$/, ".webp"))),
    },
    // Image sitemap entries help the screens show up in Google Images under each case study.
    ...PROJECTS.map((p) => ({
      url: abs(p.url),
      lastModified: BUILT,
      changeFrequency: "yearly" as const,
      priority: 0.8,
      images: [
        abs(`/media/projects/${p.slug}/share.jpg`),
        abs(`/media/projects/${p.slug}/og.jpg`),
        abs(`/media/projects/${p.slug}/01.webp`),
        ...(p.pages ?? []).map((pg) => abs(`/media/projects/${p.slug}/pages/${pg.key}-desktop.webp`)),
        ...(p.mobile ?? []).map((pg) => abs(`/media/projects/${p.slug}/pages/${pg.key}-mobile.webp`)),
      ],
    })),
  ];
}
