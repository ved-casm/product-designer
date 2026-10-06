// Produces the lightest web formats for everything in public/media, keeping quality:
//   images → AVIF (primary) + WebP (fallback for browsers without AVIF, e.g. Safari ≤ 15)
//   videos → MP4/H.264 + AVIF/WebP posters (WebM/VP9 too with MEDIA_WEBM=1, kept only if smaller)
//   project screens / cards / desktop page captures → -800w / -480w twins for srcset
// Usage: npm run media   (set FFMPEG_PATH if ffmpeg is not on PATH)
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join, extname } from "node:path";
import sharp from "sharp";

const ROOT = "public/media";
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const kb = (p) => Math.round(statSync(p).size / 1024);

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(ROOT);
let made = 0;

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const base = file.slice(0, -ext.length);

  // Images: every AVIF gets a WebP twin; WebP/PNG sources get an AVIF twin.
  if (ext === ".avif" || ext === ".webp") {
    const avif = `${base}.avif`;
    const webp = `${base}.webp`;
    if (!existsSync(webp)) {
      await sharp(file).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(webp);
      console.log(`webp  ${webp} (${kb(webp)} KB)`);
      made++;
    }
    if (!existsSync(avif)) {
      await sharp(file).avif({ quality: 55, effort: 6 }).toFile(avif);
      console.log(`avif  ${avif} (${kb(avif)} KB)`);
      made++;
    }
  }

  // Smaller twins for project screens, cards and desktop page captures (pages/<key>-desktop.webp).
  const small = file.match(/media[\\/]projects[\\/][^\\/]+[\\/](\d\d|card|pages[\\/][^\\/]+-desktop)\.webp$/);
  if (small) {
    const width = small[1] === "card" ? 480 : 800;
    const { width: full } = await sharp(file).metadata();
    for (const fmt of ["avif", "webp"]) {
      const out = `${base}-${width}w.${fmt}`;
      if (existsSync(out) || !full || full <= width) continue;
      const img = sharp(file).resize({ width });
      await (fmt === "avif" ? img.avif({ quality: 55, effort: 6 }) : img.webp({ quality: 82, effort: 6 })).toFile(out);
      console.log(`small ${out} (${kb(out)} KB)`);
      made++;
    }
  }

  // Videos: a first-frame poster for every MP4. WebM/VP9 only with MEDIA_WEBM=1: for these short,
  // already-tuned clips it came out larger than the MP4 every time, so by default we don't spend the encode.
  if (ext === ".mp4") {
    const webm = `${base}.webm`;
    if (process.env.MEDIA_WEBM === "1" && !existsSync(webm)) {
      execFileSync(ffmpeg, [
        "-y", "-loglevel", "error", "-i", file, "-an",
        "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2",
        webm,
      ]);
      // Keep the WebM only if it actually beats the (already tuned) MP4.
      if (statSync(webm).size >= statSync(file).size) {
        console.log(`webm  skipped - ${kb(webm)} KB is not smaller than mp4 ${kb(file)} KB`);
        unlinkSync(webm);
      } else {
        console.log(`webm  ${webm} (${kb(webm)} KB vs mp4 ${kb(file)} KB)`);
        made++;
      }
    }
    const poster = `${base}-poster.avif`;
    if (!existsSync(poster)) {
      const png = `${base}-poster.tmp.png`;
      execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-ss", "0.2", "-i", file, "-frames:v", "1", png]);
      await sharp(png).avif({ quality: 55, effort: 6 }).toFile(poster);
      await sharp(png).webp({ quality: 80, effort: 6 }).toFile(`${base}-poster.webp`);
      unlinkSync(png);
      console.log(`poster ${poster}`);
      made++;
    }
  }
}
console.log(made ? `done - ${made} files written` : "everything already optimised");
