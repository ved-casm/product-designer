import fs from "node:fs";
import sharp from "sharp";
import path from "node:path";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { PROJECTS } from "@/components/portfolio/content";
import { abs, ldJson, SITE_URL } from "@/lib/site";

describe("lib/site", () => {
  it("builds absolute URLs without a double slash", () => {
    expect(abs("/")).toBe(SITE_URL);
    expect(abs("/work")).toBe(`${SITE_URL}/work`);
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("serialises JSON-LD so it cannot close its <script> tag", () => {
    const out = ldJson({ name: "</script><script>alert(1)</script>" }).__html;
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("sitemap.xml", () => {
  const entries = sitemap();

  it("lists home, all works and every case study", () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toEqual(expect.arrayContaining([abs("/"), abs("/work"), ...PROJECTS.map((p) => abs(p.url))]));
    expect(urls).toHaveLength(2 + PROJECTS.length);
  });

  it("only lists images that exist", () => {
    const images = entries.flatMap((e) => e.images ?? []);
    expect(images.length).toBeGreaterThan(PROJECTS.length * 3);
    const missing = images
      .map((u) => u.replace(SITE_URL, ""))
      .filter((u) => !u.startsWith("/opengraph-image"))
      .filter((u) => !fs.existsSync(path.join(process.cwd(), "public", u)));
    expect(missing).toEqual([]);
  });
});

describe("robots.txt", () => {
  it("allows the site, keeps build output out and points at the sitemap", () => {
    const r = robots();
    expect(r.rules).toMatchObject({ userAgent: "*", allow: "/", disallow: ["/_next/"] });
    expect(r.sitemap).toBe(abs("/sitemap.xml"));
  });
});

describe("web manifest", () => {
  it("has 192 and 512 icons plus a maskable one, all on disk", () => {
    const m = manifest();
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
    for (const icon of m.icons ?? []) expect(fs.existsSync(path.join(process.cwd(), "public", icon.src))).toBe(true);
  });
});

describe("site icons", () => {
  // Google shows the favicon in a circle on light and dark results; a transparent mark disappears on dark.
  it.each([
    ["app/icon.png", 192],
    ["app/apple-icon.png", 180],
    ["public/icons/icon-192.png", 192],
    ["public/icons/icon-512.png", 512],
    ["public/icons/maskable-512.png", 512],
  ])("%s is a solid %ipx square", async (file, size) => {
    const meta = await sharp(path.join(process.cwd(), file)).metadata();
    const stats = await sharp(path.join(process.cwd(), file)).stats();
    expect([meta.width, meta.height]).toEqual([size, size]);
    expect(stats.isOpaque).toBe(true);
  });

  it("the tab icon is a multiple of 48px, as Google requires, and there is no transparent SVG icon", async () => {
    const meta = await sharp(path.join(process.cwd(), "app/icon.png")).metadata();
    expect(meta.width! % 48).toBe(0);
    expect(fs.existsSync(path.join(process.cwd(), "app/icon.svg"))).toBe(false);
  });

  it("favicon.ico carries 16, 32 and 48px images", () => {
    const buf = fs.readFileSync(path.join(process.cwd(), "app/favicon.ico"));
    const count = buf.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => buf.readUInt8(6 + i * 16));
    expect(sizes).toEqual([16, 32, 48]);
  });
});
