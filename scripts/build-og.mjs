// Link-preview images for every case study: the project's main screenshot with its name and author on top.
// Rendered with next/og, then saved as a ~150 KB JPEG (WhatsApp drops previews much over ~300 KB; a PNG of a
// photo is 800 KB+). Output: public/media/projects/<slug>/share.jpg, used by app/work/[slug]/page.tsx.
// Usage: npm run og   (re-run after changing a project's title, description, impact or og.jpg)
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og.js";
import { createElement as h } from "react";
import sharp from "sharp";
import { PROJECTS } from "../components/portfolio/content.ts";

const W = 1200;
const H = 630;
const font = (file) => readFile(join("assets/og", file));
const [inter400, inter600, serif, serifItalic, mono] = await Promise.all([
  font("inter-latin-400-normal.woff"),
  font("inter-latin-600-normal.woff"),
  font("newsreader-latin-500-normal.woff"),
  font("newsreader-latin-500-italic.woff"),
  font("monogram.png"),
]);
const monoSrc = `data:image/png;base64,${mono.toString("base64")}`;
const fonts = [
  { name: "Inter", data: inter400, weight: 400, style: "normal" },
  { name: "Inter", data: inter600, weight: 600, style: "normal" },
  { name: "Newsreader", data: serif, weight: 500, style: "normal" },
  { name: "Newsreader", data: serifItalic, weight: 500, style: "italic" },
];

const card = (p, shotSrc) =>
  h(
    "div",
    { style: { width: "100%", height: "100%", display: "flex", position: "relative", background: "#06080b", fontFamily: "Inter" } },
    h("img", { src: shotSrc, width: W, height: H, style: { position: "absolute", left: 0, top: 0, objectFit: "cover" } }),
    // Shade only where the text sits, so the screenshot stays the hero.
    h("div", {
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 330,
        display: "flex",
        background: "linear-gradient(180deg, rgba(6,8,11,0) 0%, rgba(6,8,11,0.78) 45%, rgba(6,8,11,0.94) 100%)",
      },
    }),
    h(
      "div",
      {
        style: {
          position: "absolute",
          left: 40,
          top: 36,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 18px 10px 12px",
          borderRadius: 999,
          background: "rgba(6,8,11,0.72)",
          color: "#eef2f6",
          fontSize: 22,
          letterSpacing: "-0.4px",
        },
      },
      h("img", { src: monoSrc, width: 34, height: 32 }),
      "vedank gaur · case study",
    ),
    h(
      "div",
      { style: { position: "absolute", left: 56, right: 56, bottom: 44, display: "flex", flexDirection: "column", color: "#eef2f6" } },
      h("div", { style: { fontFamily: "Newsreader", fontSize: 92, lineHeight: 1, letterSpacing: "-3px" } }, p.title),
      h("div", { style: { marginTop: 16, fontSize: 26, lineHeight: 1.3, color: "#c9d1db", letterSpacing: "-0.6px", maxWidth: 900 } }, p.desc),
      p.impact
        ? h(
            "div",
            { style: { marginTop: 14, fontFamily: "Newsreader", fontStyle: "italic", fontSize: 28, color: "#5be7ff", letterSpacing: "-0.5px" } },
            p.impact,
          )
        : null,
    ),
  );

for (const p of PROJECTS) {
  const dir = join("public/media/projects", p.slug);
  const shot = await readFile(join(dir, "og.jpg"));
  const png = Buffer.from(await new ImageResponse(card(p, `data:image/jpeg;base64,${shot.toString("base64")}`), { width: W, height: H, fonts }).arrayBuffer());
  const out = join(dir, "share.jpg");
  await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
  console.log(`${out}  ${Math.round((await stat(out)).size / 1024)} KB`);
}
