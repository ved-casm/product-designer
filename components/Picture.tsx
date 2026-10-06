import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string;
  /** Width of the `<name>-<small>w` twin made by `npm run media`; with `sizes`, lets the browser pick it. */
  small?: number;
};

/**
 * AVIF first (lightest), WebP for browsers without AVIF (e.g. Safari ≤ 15).
 * `display: contents` keeps the <img> as the layout box, so existing CSS still applies.
 * Expects `<name>.avif` and `<name>.webp` side by side (see `npm run media`).
 */
export default function Picture({ src, alt = "", small, sizes, ...img }: Props) {
  const m = src.match(/^(.*)\.(avif|webp)$/i);
  if (!m) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} sizes={sizes} {...img} />;
  }
  // Originals are at most 1600px wide; the exact figure only matters above the small twin.
  const set = (ext: string) => (small && sizes ? `${m[1]}-${small}w.${ext} ${small}w, ${m[1]}.${ext} 1600w` : `${m[1]}.${ext}`);
  return (
    <picture style={{ display: "contents" }}>
      <source srcSet={set("avif")} sizes={small ? sizes : undefined} type="image/avif" />
      <img src={`${m[1]}.webp`} srcSet={small && sizes ? set("webp") : undefined} sizes={small ? sizes : undefined} alt={alt} {...img} />
    </picture>
  );
}
