// Helpers for manipulating SVG path strings.

/** Reverse a path made only of a leading M followed by absolute C segments. */
export const reverseCubicPath = (d: string) => {
  const tokens = d.match(/[MC]|-?\d*\.?\d+/g) ?? [];
  if (tokens[0] !== "M") return d;
  let i = 1;
  let cursor: [number, number] = [Number(tokens[i++]), Number(tokens[i++])];
  const segs: { start: [number, number]; c1: [number, number]; c2: [number, number]; end: [number, number] }[] = [];
  while (i < tokens.length && tokens[i++] === "C") {
    while (i < tokens.length && tokens[i] !== "M" && tokens[i] !== "C") {
      const c1: [number, number] = [Number(tokens[i++]), Number(tokens[i++])];
      const c2: [number, number] = [Number(tokens[i++]), Number(tokens[i++])];
      const end: [number, number] = [Number(tokens[i++]), Number(tokens[i++])];
      segs.push({ start: cursor, c1, c2, end });
      cursor = end;
    }
  }
  const pt = ([x, y]: [number, number]) => `${x} ${y}`;
  const last = segs[segs.length - 1]?.end;
  return last
    ? `M${pt(last)}${segs
        .reverse()
        .map((s) => `C${pt(s.c2)} ${pt(s.c1)} ${pt(s.start)}`)
        .join("")}`
    : d;
};

/** Drop the leading moveto so a path can be appended onto another. */
export const stripMove = (d: string) => d.replace(/^M-?\d*\.?\d+ -?\d*\.?\d+/, "");

/**
 * Flatten a path made of absolute M / L / C / Z commands into a dense polyline.
 * Done in JS because SVGPathElement.getPointAtLength is O(path) per call - on the
 * long scribble that was ~10ms each, freezing the page for over a minute.
 */
export function flattenPath(d: string) {
  const tokens = d.match(/[MLCZmlcz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  let i = 0;
  let cmd = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const num = () => Number(tokens[i++]);
  const push = (x: number, y: number) => {
    xs.push(x);
    ys.push(y);
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd !== cmd.toUpperCase()) throw new Error(`Relative path command "${cmd}" not supported`);
    if (cmd === "M") {
      cx = sx = num();
      cy = sy = num();
      push(cx, cy);
      cmd = "L";
    } else if (cmd === "L") {
      cx = num();
      cy = num();
      push(cx, cy);
    } else if (cmd === "C") {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
      const poly = Math.hypot(x1 - cx, y1 - cy) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x - x2, y - y2);
      const steps = Math.min(128, Math.max(4, Math.ceil(poly / 3)));
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        const u = 1 - t;
        const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
        push(a * cx + b * x1 + c * x2 + e * x, a * cy + b * y1 + c * y2 + e * y);
      }
      cx = x;
      cy = y;
    } else if (cmd === "Z") {
      cx = sx;
      cy = sy;
      push(cx, cy);
    } else {
      throw new Error(`Path command "${cmd}" not supported`);
    }
  }
  return { xs, ys };
}

/** Arc-length samples of a path: [{ x, y, s }] every `step` units, plus the total length. */
export function samplePath(d: string, step: number) {
  const { xs, ys } = flattenPath(d);
  const pts = [{ x: xs[0], y: ys[0], s: 0 }];
  let travelled = 0;
  let next = step;
  for (let k = 1; k < xs.length; k++) {
    const seg = Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]);
    while (seg > 0 && next <= travelled + seg) {
      const t = (next - travelled) / seg;
      pts.push({ x: xs[k - 1] + (xs[k] - xs[k - 1]) * t, y: ys[k - 1] + (ys[k] - ys[k - 1]) * t, s: next });
      next += step;
    }
    travelled += seg;
  }
  pts.push({ x: xs[xs.length - 1], y: ys[ys.length - 1], s: travelled });
  return { pts, length: travelled };
}
