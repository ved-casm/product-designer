import fs from "node:fs";
import path from "node:path";
import { PROJECTS, WORKS } from "@/components/portfolio/content";

const publicFile = (url: string) => path.join(process.cwd(), "public", url);

describe("project content", () => {
  it("has unique slugs, and each project's url points at its own case study", () => {
    const slugs = PROJECTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of PROJECTS) expect(p.url).toBe(`/work/${p.slug}`);
  });

  it.each(PROJECTS.map((p) => [p.slug, p] as const))("%s has the full case-study brief", (_slug, p) => {
    for (const field of ["title", "desc", "overview", "challenge", "service", "industry", "goal", "solution"] as const) {
      expect(p[field].trim().length).toBeGreaterThan(0);
    }
    expect(p.pillars).toHaveLength(3);
    for (const pillar of p.pillars) {
      expect(pillar.title.trim()).not.toBe("");
      expect(pillar.text.trim()).not.toBe("");
    }
    if (p.live) expect(p.live).toMatch(/^https:\/\//);
  });

  it.each(PROJECTS.map((p) => [p.slug, p] as const))("%s has every image it references on disk", (_slug, p) => {
    const files = [
      p.image,
      p.image.replace(/\.avif$/, ".webp"),
      `/media/projects/${p.slug}/og.jpg`,
      `/media/projects/${p.slug}/share.jpg`,
      ...Array.from({ length: p.shots }, (_, i) => `/media/projects/${p.slug}/${String(i + 1).padStart(2, "0")}.webp`),
      ...(p.pages ?? []).flatMap((pg) => [
        `/media/projects/${p.slug}/pages/${pg.key}-desktop.avif`,
        `/media/projects/${p.slug}/pages/${pg.key}-desktop.webp`,
        `/media/projects/${p.slug}/pages/${pg.key}-desktop-800w.avif`,
      ]),
      ...(p.mobile ?? []).flatMap((pg) => [`/media/projects/${p.slug}/pages/${pg.key}-mobile.avif`, `/media/projects/${p.slug}/pages/${pg.key}-mobile.webp`]),
    ];
    const missing = files.filter((f) => !fs.existsSync(publicFile(f)));
    expect(missing).toEqual([]);
  });

  it("only offers filters that at least one project carries", () => {
    for (const tag of WORKS.filters) expect(PROJECTS.some((p) => p.tags.includes(tag))).toBe(true);
  });

  it("uses no long dashes in visible copy", () => {
    const copy = JSON.stringify(PROJECTS);
    expect(copy).not.toContain("—");
  });
});
