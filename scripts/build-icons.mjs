// Site icons from the VV monogram: white on the site's ink (#06080b), never transparent, so the mark reads on
// Google's light and dark results, browser tabs and home screens alike.
// Output: app/icon.png (192, a multiple of 48 as Google asks), app/apple-icon.png (180), app/favicon.ico (16/32/48),
// public/icons/icon-{192,512}.png and maskable-512.png. Usage: npm run icons
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const SRC = "public/media/brand/monogram.png"; // black mark on transparent
const INK = "#06080b";

// The mark's own shape, filled white.
const meta = await sharp(SRC).metadata();
const white = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: "#ffffff" } })
  .composite([{ input: SRC, blend: "dest-in" }])
  .png()
  .toBuffer();

/** A square icon: the mark centred at `frac` of the side on solid ink. */
async function icon(size, frac) {
  const mark = await sharp(white)
    .resize({ width: Math.round(size * frac), height: Math.round(size * frac), fit: "inside", kernel: "lanczos3" })
    .toBuffer();
  const m = await sharp(mark).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background: INK } })
    .composite([{ input: mark, left: Math.round((size - m.width) / 2), top: Math.round((size - m.height) / 2) }])
    .flatten({ background: INK })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** A .ico holding PNG images (supported by every current browser and by Google). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

const out = [
  ["app/icon.png", await icon(192, 0.66)],
  ["app/apple-icon.png", await icon(180, 0.62)],
  ["public/icons/icon-192.png", await icon(192, 0.66)],
  ["public/icons/icon-512.png", await icon(512, 0.66)],
  // Maskable: launchers crop to circles or squircles; keep the mark inside the central safe zone.
  ["public/icons/maskable-512.png", await icon(512, 0.5)],
  // Tiny sizes get a larger mark so the thin strokes survive.
  ["app/favicon.ico", ico([{ size: 16, data: await icon(16, 0.86) }, { size: 32, data: await icon(32, 0.78) }, { size: 48, data: await icon(48, 0.72) }])],
];
for (const [file, data] of out) {
  await writeFile(file, data);
  console.log(`${file}  ${Math.round(data.length / 1024)} KB`);
}
