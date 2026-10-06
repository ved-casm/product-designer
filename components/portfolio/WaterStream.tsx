"use client";

import type { Easing, Liquid, Stream, WaterTheme } from "./water-shared";
export type { Easing, Liquid, Stream, WaterTheme } from "./water-shared";
export { WATER_SYNC_EVENT } from "./water-shared";
import { hasWebGL, WATER_SYNC_EVENT } from "./water-shared";
import { flattenPath } from "../pathUtils";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Clock,
  Color,
  DoubleSide,
  Mesh,
  NormalBlending,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";





type Props = {
  /** SVG that defines the coordinate system the paths live in. */
  svgRef: RefObject<SVGSVGElement | null>;
  viewBox: { w: number; h: number };
  streams: Stream[];
  theme: WaterTheme;
  /** Element whose CSS `filter` (motion blur) is mirrored onto the canvas. */
  filterSourceRef?: RefObject<HTMLElement | null>;
  style?: CSSProperties;
  /**
   * Render into a ~2-viewport-tall canvas that lives inside the scrolling content (the
   * parent must be position:relative) instead of a fixed overlay. It scrolls natively with
   * the page, so the stream can never drift from its path while scrolling.
   */
  windowed?: boolean;
  /** Optional liquid filling a vessel shape, drawn under the streams in the same canvas. */
  liquid?: Liquid;
};

/* ------------------------------------------------------------------ */
/* Easing - CSS cubic-bezier equivalents                               */
/* ------------------------------------------------------------------ */

const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = dsx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - x) / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
};

const EASE: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  "ease-out": bezier(0, 0, 0.58, 1),
  "ease-in-out": bezier(0.42, 0, 0.58, 1),
};

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */

const VERT = /* glsl */ `
  attribute vec2 aCenter;
  attribute vec2 aNormal;
  attribute float aDist;
  attribute float aSide;
  attribute float aMaxHalf;
  uniform float uHalfWidth;
  uniform float uMinHalf;
  uniform float uTime;
  uniform vec2 uScale;
  uniform vec2 uOffset;
  varying float vDist;
  varying float vSide;
  void main() {
    // Ripples travelling down the stream make its width breathe.
    float wob = 1.0 + 0.16 * sin(aDist * 0.045 - uTime * 4.2) + 0.07 * sin(aDist * 0.13 + uTime * 2.3);
    // Never wider than the local turning radius, or the ribbon folds over itself on tight loops.
    float hw = max(uMinHalf, min(uHalfWidth * wob, aMaxHalf));
    vec2 p = aCenter + aNormal * aSide * hw;
    vDist = aDist;
    vSide = aSide;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p * uScale + uOffset, 0.0, 1.0);
  }
`;

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  uniform float uCapStart;
  uniform float uCapEnd;
  // 0 at the very ends of the visible range, 1 once we're ~22 units in. Joined ends stay full width.
  float taper(float d, float s, float e) {
    return mix(1.0, smoothstep(0.0, 22.0, e - d), uCapEnd) * mix(1.0, smoothstep(0.0, 22.0, d - s), uCapStart);
  }
`;

const CORE_FRAG = /* glsl */ `
  uniform float uStart;
  uniform float uEnd;
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uFoam;
  uniform float uOpacity;
  varying float vDist;
  varying float vSide;
  ${NOISE}
  void main() {
    if (vDist < uStart || vDist > uEnd) discard;
    float edge = abs(vSide);
    float tp = taper(vDist, uStart, uEnd);
    float w = max(tp, 0.001);
    float alpha = 1.0 - smoothstep(0.5 * w, w, edge);
    if (alpha <= 0.001) discard;

    float flow = vDist * 0.03 - uTime * 2.4;
    float n = fbm(vec2(flow, vSide * 1.6 + uTime * 0.35));
    float center = 1.0 - edge;

    vec3 col = mix(uDeep, uMid, clamp(center * 0.85 + (n - 0.5) * 0.7, 0.0, 1.0));
    // Foam streaks racing along the current.
    float streak = smoothstep(0.58, 0.88, n + 0.22 * sin(vDist * 0.085 - uTime * 7.0));
    col = mix(col, uFoam, streak * 0.8);
    // Thin specular sheen riding just off-centre.
    float sheen = exp(-pow((vSide + 0.32) * 4.5, 2.0)) * (0.55 + 0.45 * sin(vDist * 0.05 - uTime * 5.0 + n * 6.0));
    col += uFoam * sheen * 0.55;
    // The leading edge of the stream glints.
    col += uFoam * smoothstep(48.0, 0.0, uEnd - vDist) * 0.45 * uCapEnd;

    gl_FragColor = vec4(col, alpha * (0.82 + 0.18 * n) * uOpacity);
  }
`;

const GLOW_FRAG = /* glsl */ `
  uniform float uStart;
  uniform float uEnd;
  uniform float uTime;
  uniform vec3 uGlow;
  uniform float uStrength;
  varying float vDist;
  varying float vSide;
  ${NOISE}
  void main() {
    if (vDist < uStart || vDist > uEnd) discard;
    float tp = taper(vDist, uStart, uEnd);
    float g = exp(-vSide * vSide * 4.0) * tp;
    float pulse = 0.72 + 0.28 * sin(vDist * 0.018 - uTime * 3.0);
    float n = fbm(vec2(vDist * 0.012 - uTime * 0.8, vSide));
    gl_FragColor = vec4(uGlow, g * pulse * (0.7 + 0.6 * n) * uStrength);
  }
`;

const PALETTE: Record<WaterTheme, { deep: string; mid: string; foam: string; glow: string; glowStrength: number; additive: boolean }> = {
  light: { deep: "#0a3d91", mid: "#1d8cf8", foam: "#e9fbff", glow: "#2f8cff", glowStrength: 0.16, additive: false },
  dark: { deep: "#0a4f8a", mid: "#22c6ff", foam: "#f2feff", glow: "#3fdcff", glowStrength: 0.6, additive: true },
};

/* ------------------------------------------------------------------ */
/* Liquid fill (water inside a vessel shape)                           */
/* ------------------------------------------------------------------ */


const LIQUID_VERT = /* glsl */ `
  attribute vec2 aPos;
  uniform vec2 uScale;
  uniform vec2 uOffset;
  uniform vec2 uSize;
  varying vec2 vUv;
  void main() {
    vUv = aPos / uSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(aPos * uScale + uOffset, 0.0, 1.0);
  }
`;

const LIQUID_FRAG = /* glsl */ `
  uniform sampler2D uMask;
  uniform float uLevel;
  uniform float uTime;
  uniform float uAgitate;
  uniform float uDark;
  uniform vec3 uColor;
  uniform vec3 uDeep;
  varying vec2 vUv;

  float hash1(float n) { return fract(sin(n) * 43758.5453); }

  // Net of bright ridges from a domain-warped sine field: light focused by the waves above.
  float caustic(vec2 p, float t) {
    vec2 q = p;
    float v = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      q += vec2(sin(q.y * 1.7 + t * 0.9 + fi), cos(q.x * 1.3 - t * 0.7 + fi * 1.7)) * 0.45;
      v += 1.0 - abs(sin(q.x + q.y * 0.6 + t * 0.5));
    }
    return pow(v / 3.0, 6.0);
  }

  void main() {
    float m = texture2D(uMask, vUv).a;
    if (m < 0.01) discard;
    float x = vUv.x;
    float y = vUv.y;
    float base = 1.0 - uLevel;
    float slosh = sin(uTime * 1.6) * 0.05 * (x - 0.5) * uAgitate;
    float front = base + sin(x * 9.0 + uTime * 2.2) * 0.010 + sin(x * 17.0 - uTime * 3.1) * 0.005 + slosh;
    // The far edge of the surface sits a little higher, so the top reads as a tilted plane.
    float back = base - 0.045 + sin(x * 7.0 - uTime * 1.7) * 0.008 - slosh * 0.6;
    if (y < back) discard;

    vec3 col;
    float a;
    if (y < front) {
      // Surface seen from slightly above: sky reflection with a fresnel ramp and a moving glint.
      float t = (y - back) / max(front - back, 1e-3);
      vec3 sky = mix(uDark > 0.5 ? vec3(0.55, 0.75, 0.95) : vec3(0.93, 0.98, 1.0), uColor * 1.25, t);
      float glintX = 0.34 + 0.06 * sin(uTime * 0.7);
      float glint = pow(max(0.0, 1.0 - abs(x - glintX) * 5.0), 4.0) * (1.0 - t);
      col = sky + vec3(glint) * 0.9 + 0.05 * sin(x * 46.0 + t * 7.0 - uTime * 4.0);
      a = 0.9;
    } else {
      float depth = clamp((y - front) / max(1.0 - front, 1e-3), 0.0, 1.0);
      col = mix(uColor, uDeep, smoothstep(0.0, 1.0, depth));
      col += vec3(caustic(vec2(x * 7.0, y * 7.0 - uTime * 0.35), uTime) * 0.35 * (1.0 - depth * 0.6));
      float rays = smoothstep(0.55, 1.0, sin(x * 16.0 + sin(y * 3.0 + uTime) * 1.5 + uTime * 0.5));
      col += vec3(rays * (1.0 - depth) * 0.1);
      // Bright meniscus right under the surface line.
      col += vec3(smoothstep(0.014, 0.0, y - front) * 0.55);
      // Rising bubbles.
      for (int k = 0; k < 6; k++) {
        float fk = float(k);
        float bx = 0.2 + 0.6 * hash1(fk * 12.9);
        float by = 1.0 - fract(uTime * (0.08 + 0.05 * hash1(fk * 3.1)) + hash1(fk * 7.7));
        if (by < front + 0.02) continue;
        vec2 d = vec2(x - bx - 0.01 * sin(uTime * 3.0 + fk), y - by);
        float r = 0.008 + 0.01 * hash1(fk * 5.3);
        float dist = length(d);
        col += vec3(smoothstep(r, r * 0.6, dist) * smoothstep(r * 0.2, r * 0.7, dist) * 0.7);
      }
      a = 0.8 + depth * 0.14;
    }
    // Curved-glass reflections down the vessel.
    col += vec3(exp(-pow((x - 0.24) * 13.0, 2.0)) * 0.16 + exp(-pow((x - 0.8) * 28.0, 2.0)) * 0.07);
    gl_FragColor = vec4(col, a * m);
  }
`;

/** Rasterise the vessel outline into an alpha mask once. */
function maskTexture(d: string, w: number, h: number) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.scale(size / w, size / h);
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(d));
  const tex = new CanvasTexture(c);
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

function buildLiquid(spec: Liquid, w: number, h: number) {
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(12), 3));
  geo.setAttribute("aPos", new BufferAttribute(new Float32Array([0, 0, w, 0, 0, h, w, h]), 2));
  geo.setIndex([0, 2, 1, 1, 2, 3]);
  geo.boundingSphere = new Sphere(new Vector3(), Infinity);
  const mat = new ShaderMaterial({
    vertexShader: LIQUID_VERT,
    fragmentShader: LIQUID_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uMask: { value: maskTexture(spec.mask, w, h) },
      uLevel: { value: 0 },
      uTime: { value: 0 },
      uAgitate: { value: 0 },
      uDark: { value: 0 },
      uColor: { value: new Color(spec.color) },
      uDeep: { value: new Color(spec.deep) },
      uScale: { value: new Vector2(1, 1) },
      uOffset: { value: new Vector2() },
      uSize: { value: new Vector2(w, h) },
    },
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, geo, mat };
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

const SAMPLE_STEP = 3;

/** Sample a path into a ribbon centreline: positions, normals and arc length per vertex pair. */
function buildRibbon(d: string) {
  const { xs, ys } = flattenPath(d);
  // Resample the dense polyline at a uniform arc-length step.
  const pts: { x: number; y: number; s: number }[] = [{ x: xs[0], y: ys[0], s: 0 }];
  let travelled = 0;
  let nextS = SAMPLE_STEP;
  for (let k = 1; k < xs.length; k++) {
    const seg = Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]);
    while (seg > 0 && nextS <= travelled + seg) {
      const t = (nextS - travelled) / seg;
      pts.push({ x: xs[k - 1] + (xs[k] - xs[k - 1]) * t, y: ys[k - 1] + (ys[k] - ys[k - 1]) * t, s: nextS });
      nextS += SAMPLE_STEP;
    }
    travelled += seg;
  }
  const length = travelled;
  pts.push({ x: xs[xs.length - 1], y: ys[ys.length - 1], s: length });
  const count = pts.length;

  // Local turning radius from points ~CURV_K samples apart, then min- and box-filtered
  // along the path so the width eases in and out of tight turns instead of snapping.
  const CURV_K = 2;
  const radius = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = pts[Math.max(0, i - CURV_K)];
    const b = pts[i];
    const c = pts[Math.min(count - 1, i + CURV_K)];
    const ab = Math.hypot(b.x - a.x, b.y - a.y);
    const bc = Math.hypot(c.x - b.x, c.y - b.y);
    const ca = Math.hypot(a.x - c.x, a.y - c.y);
    const cross = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
    radius[i] = cross < 1e-6 ? 1e4 : (ab * bc * ca) / (2 * cross);
  }
  const WIN = 6;
  const minR = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let m = Infinity;
    for (let j = Math.max(0, i - WIN); j <= Math.min(count - 1, i + WIN); j++) m = Math.min(m, radius[j]);
    minR[i] = m;
  }
  const maxHalf = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - WIN); j <= Math.min(count - 1, i + WIN); j++) {
      sum += Math.min(minR[j], 1e3);
      n++;
    }
    maxHalf[i] = (sum / n) * 0.9;
  }

  const center = new Float32Array(count * 2 * 2);
  const maxHalfAttr = new Float32Array(count * 2);
  const normal = new Float32Array(count * 2 * 2);
  const dist = new Float32Array(count * 2);
  const side = new Float32Array(count * 2);
  const position = new Float32Array(count * 2 * 3);
  let nx = 0;
  let ny = 1;
  for (let i = 0; i < count; i++) {
    // Tangent over a wider window rounds off sharp corners in the source path.
    const a = pts[Math.max(0, i - 3)];
    const b = pts[Math.min(count - 1, i + 3)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty);
    if (len > 1e-6) {
      nx = -ty / len;
      ny = tx / len;
    }
    for (let k = 0; k < 2; k++) {
      const v = i * 2 + k;
      center[v * 2] = pts[i].x;
      center[v * 2 + 1] = pts[i].y;
      normal[v * 2] = nx;
      normal[v * 2 + 1] = ny;
      dist[v] = pts[i].s;
      maxHalfAttr[v] = maxHalf[i];
      side[v] = k === 0 ? -1 : 1;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(position, 3));
  geo.setAttribute("aCenter", new BufferAttribute(center, 2));
  geo.setAttribute("aNormal", new BufferAttribute(normal, 2));
  geo.setAttribute("aDist", new BufferAttribute(dist, 1));
  geo.setAttribute("aSide", new BufferAttribute(side, 1));
  geo.setAttribute("aMaxHalf", new BufferAttribute(maxHalfAttr, 1));
  geo.setIndex(index);
  // The vertex shader moves everything, so bounds-based culling would be wrong.
  geo.boundingSphere = new Sphere(new Vector3(), Infinity);
  return { geo, length };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

type Tween = { from: number; to: number; t0: number };

type Entry = {
  d: string;
  length: number;
  geo: BufferGeometry;
  core: ShaderMaterial;
  glow: ShaderMaterial;
  start: Tween;
  end: Tween;
  spec: Stream;
};

const tweenValue = (tw: Tween, now: number, spec: Stream) => {
  if (spec.duration <= 0) return tw.to;
  const t = Math.min(1, (now - tw.t0) / spec.duration);
  return tw.from + (tw.to - tw.from) * EASE[spec.easing](t);
};

/**
 * Renders flowing water along SVG paths with three.js. The canvas is positioned by the
 * parent; each frame the reference SVG's on-screen box maps viewBox units to canvas pixels.
 */
export default function WaterStream({ svgRef, viewBox, streams, theme, filterSourceRef, style, liquid, windowed }: Props) {
  // React renders only this box (it carries the layout styles); each GL session creates its own canvas inside it,
  // so the context can be released for real on cleanup without breaking a re-run on the same element.
  const boxRef = useRef<HTMLDivElement>(null);
  const streamsRef = useRef(streams);
  const themeRef = useRef(theme);
  const liquidRef = useRef(liquid);

  useEffect(() => {
    streamsRef.current = streams;
    liquidRef.current = liquid;
    themeRef.current = theme;
  });

  // Create the WebGL context only once the canvas is near the viewport: off-screen
  // streams (venn, process, contact) cost nothing on first load.
  const [near, setNear] = useState(false);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || near) return;
    let idle = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          // Creating a context and compiling shaders takes a beat: do it in an idle moment,
          // not in the middle of a scroll frame.
          idle = window.requestIdleCallback
            ? window.requestIdleCallback(() => setNear(true), { timeout: 400 })
            : window.setTimeout(() => setNear(true), 0);
        }
      },
      { rootMargin: "60% 60% 60% 60%" },
    );
    // A windowed box stays wherever it last drew, possibly far down its section: watch the section instead.
    io.observe(windowed ? (box.parentElement ?? box) : box);
    return () => {
      io.disconnect();
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [near, windowed]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !near) return;
    // No WebGL (old GPU, blocked drivers, locked-down browsers): skip the water, keep the page.
    if (!hasWebGL()) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    box.appendChild(canvas);
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
    } catch {
      canvas.remove();
      return;
    }
    // Reading shader logs after every compile makes the browser wait for the compile to finish; only useful in dev.
    renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
    renderer.setClearColor(0x000000, 0);
    const scene = new Scene();
    const camera = new OrthographicCamera(0, 1, 0, 1, 0.1, 10);
    camera.position.z = 1;

    // Only streams on (or about to come on) screen render; the rest skip their frame entirely, layout reads included.
    // A windowed box only moves while it draws, so watch its section instead or it could strand itself off screen.
    const watched = windowed ? (box.parentElement ?? box) : box;
    let onScreen = true;
    const seen = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { rootMargin: "25%" });
    seen.observe(watched);
    // Browsers keep only a handful of WebGL contexts alive (fewer on phones) and kill the oldest past that, which
    // left the hero stream blank after scrolling the whole page. A stream ~3 screens away gives its context back
    // in an idle moment (not mid-scroll, and not if it comes back first) and builds a new one when it comes near
    // again (the effect re-runs through `near`).
    let release = 0;
    const cancelRelease = () => {
      if (!release) return;
      if (window.cancelIdleCallback) window.cancelIdleCallback(release);
      else window.clearTimeout(release);
      release = 0;
    };
    const far = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) cancelRelease();
        else if (!release)
          release = window.requestIdleCallback
            ? window.requestIdleCallback(() => setNear(false), { timeout: 3000 })
            : window.setTimeout(() => setNear(false), 500);
      },
      { rootMargin: "300%" },
    );
    far.observe(watched);
    // If the browser takes the context anyway, rebuild instead of staying blank.
    const onLost = (e: Event) => {
      e.preventDefault();
      setNear(false);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    // Phones have 3× screens; the glow reads the same at 1.5× for less than half the pixels.
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    const entries: Entry[] = [];
    let appliedTheme: WaterTheme | null = null;
    let cssW = 0;
    let cssH = 0;
    let raf = 0;
    const clock = new Clock();
    let modestDpr = false;

    // Windowed mode: keep the box covering the visible slice of its parent, moving it
    // only when the viewport is about to leave it (the move and the redraw share a frame).
    // The height only ever grows: on phones the address bar changes innerHeight while scrolling, and resizing
    // would reallocate the drawing buffer every time it slides.
    let tallest = 0;
    const placeWindow = () => {
      const host = box.parentElement;
      if (!host) return;
      const vh = window.innerHeight;
      tallest = Math.max(tallest, vh);
      const h = Math.round(tallest * 2);
      if (box.style.height !== `${h}px`) box.style.height = `${h}px`;
      const hostRect = host.getBoundingClientRect();
      const visTop = -hostRect.top;
      const top = parseFloat(box.style.top) || 0;
      if (visTop < top || visTop + vh > top + h) {
        const next = Math.max(0, Math.min(hostRect.height - h, visTop - vh * 0.5));
        box.style.top = `${Math.round(next)}px`;
      }
    };

    let fill: ReturnType<typeof buildLiquid> | null = null;
    let fillTween = { from: 0, to: 0, t0: 0, duration: 0 };
    let agitate = 0;
    const currentLevel = (now: number) => {
      const t = fillTween.duration > 0 ? Math.min(1, (now - fillTween.t0) / fillTween.duration) : 1;
      return fillTween.from + (fillTween.to - fillTween.from) * EASE["ease-in-out"](t);
    };
    const syncLiquid = (now: number) => {
      const spec = liquidRef.current;
      if (!spec) return;
      if (!fill) {
        fill = buildLiquid(spec, viewBox.w, viewBox.h);
        scene.add(fill.mesh);
      }
      if (spec.level !== fillTween.to) {
        fillTween = { from: currentLevel(now), to: spec.level, t0: now, duration: spec.duration };
        agitate = 1;
      }
    };

    const applyTheme = (t: WaterTheme) => {
      const p = PALETTE[t];
      for (const e of entries) {
        e.core.uniforms.uDeep.value.set(p.deep);
        e.core.uniforms.uMid.value.set(p.mid);
        e.core.uniforms.uFoam.value.set(p.foam);
        e.glow.uniforms.uGlow.value.set(p.glow);
        e.glow.uniforms.uStrength.value = p.glowStrength;
        e.glow.blending = p.additive ? AdditiveBlending : NormalBlending;
        e.glow.needsUpdate = true;
      }
      appliedTheme = t;
    };

    const toUnits = (e: { length: number }, spec: Stream, v: number) => (spec.normalized ? v * e.length : v);

    const sync = (now: number) => {
      const specs = streamsRef.current;
      // Rebuild when the set of paths changes.
      if (specs.length !== entries.length || specs.some((s, i) => s.d !== entries[i].d)) {
        for (const e of entries) {
          scene.remove(e.core.userData.mesh, e.glow.userData.mesh);
          e.geo.dispose();
          e.core.dispose();
          e.glow.dispose();
        }
        entries.length = 0;
        for (const spec of specs) {
          const { geo, length } = buildRibbon(spec.d);
          const shared = {
            uStart: { value: 0 },
            uEnd: { value: 0 },
            uTime: { value: 0 },
            uScale: { value: new Vector2(1, 1) },
            uOffset: { value: new Vector2() },
            uCapStart: { value: 1 },
            uCapEnd: { value: 1 },
          };
          const core = new ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: CORE_FRAG,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: DoubleSide,
            uniforms: {
              ...shared,
              uHalfWidth: { value: spec.width / 2 },
              uMinHalf: { value: spec.width * 0.18 },
              uDeep: { value: new Color() },
              uMid: { value: new Color() },
              uFoam: { value: new Color() },
              uOpacity: { value: 1 },
            },
          });
          const glow = new ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: GLOW_FRAG,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: DoubleSide,
            uniforms: {
              ...shared,
              uHalfWidth: { value: spec.width * (spec.glowScale ?? 3.2) },
              uMinHalf: { value: spec.width * 0.4 },
              uGlow: { value: new Color() },
              uStrength: { value: 0.5 },
            },
          });
          const glowMesh = new Mesh(geo, glow);
          const coreMesh = new Mesh(geo, core);
          glowMesh.renderOrder = 0;
          coreMesh.renderOrder = 1;
          glowMesh.frustumCulled = false;
          coreMesh.frustumCulled = false;
          core.userData.mesh = coreMesh;
          glow.userData.mesh = glowMesh;
          scene.add(glowMesh, coreMesh);
          const s0 = toUnits({ length }, spec, spec.start);
          const e0 = toUnits({ length }, spec, spec.end);
          entries.push({
            d: spec.d,
            length,
            geo,
            core,
            glow,
            spec,
            start: { from: s0, to: s0, t0: now },
            // Grow in from nothing: the renderer may start after the target was already set.
            end: { from: s0, to: e0, t0: now },
          });
        }
        appliedTheme = null;
      }
      // Retarget tweens when the requested range changes.
      specs.forEach((spec, i) => {
        const e = entries[i];
        const s = toUnits(e, spec, spec.start);
        const en = toUnits(e, spec, spec.end);
        if (s !== e.start.to) e.start = { from: tweenValue(e.start, now, e.spec), to: s, t0: now };
        if (en !== e.end.to) e.end = { from: tweenValue(e.end, now, e.spec), to: en, t0: now };
        e.spec = spec;
        e.core.uniforms.uHalfWidth.value = spec.width / 2;
        e.glow.uniforms.uHalfWidth.value = spec.width * (spec.glowScale ?? 3.2);
      });
      if (appliedTheme !== themeRef.current) applyTheme(themeRef.current);
    };

    const draw = () => {
      const svg = svgRef.current;
      if (!svg || document.hidden) return;
      const now = performance.now();
      sync(now);

      if (windowed) placeWindow();
      const cRect = canvas.getBoundingClientRect();
      if (cRect.bottom <= 0 || cRect.top >= window.innerHeight || cRect.width === 0) return;
      const sRect = svg.getBoundingClientRect();
      if (sRect.right < cRect.left - 200 || sRect.left > cRect.right + 200 || sRect.bottom < cRect.top - 200 || sRect.top > cRect.bottom + 200) {
        renderer.clear();
        return;
      }

      if (cRect.width !== cssW || cRect.height !== cssH) {
        cssW = cRect.width;
        cssH = cRect.height;
        renderer.setPixelRatio(Math.min(modestDpr ? 1.25 : coarse ? 1.5 : 2, window.devicePixelRatio || 1));
        renderer.setSize(cssW, cssH, false);
        camera.left = 0;
        camera.right = cssW;
        camera.top = 0;
        camera.bottom = cssH;
        camera.updateProjectionMatrix();
      }

      const sx = sRect.width / viewBox.w;
      const sy = sRect.height / viewBox.h;
      const ox = sRect.left - cRect.left;
      const oy = sRect.top - cRect.top;
      const time = clock.getElapsedTime();
      for (const e of entries) {
        const start = tweenValue(e.start, now, e.spec);
        const end = tweenValue(e.end, now, e.spec);
        const capStart = e.spec.joinStart && start <= 1 ? 0 : 1;
        const capEnd = e.spec.joinEnd && end >= e.length - 1 ? 0 : 1;
        for (const m of [e.core, e.glow]) {
          m.uniforms.uCapStart.value = capStart;
          m.uniforms.uCapEnd.value = capEnd;
          m.uniforms.uStart.value = start;
          m.uniforms.uEnd.value = end;
          m.uniforms.uTime.value = time;
          m.uniforms.uScale.value.set(sx, sy);
          m.uniforms.uOffset.value.set(ox, oy);
        }
        const visible = end - start > 0.5;
        e.core.userData.mesh.visible = visible;
        e.glow.userData.mesh.visible = visible;
      }
      syncLiquid(now);
      if (fill) {
        const u = fill.mat.uniforms;
        const level = currentLevel(now);
        // Sloshing settles after a fill but never goes perfectly still.
        agitate = Math.max(0.3, agitate * 0.985);
        u.uLevel.value = level;
        u.uTime.value = time;
        u.uAgitate.value = agitate;
        u.uDark.value = themeRef.current === "dark" ? 1 : 0;
        u.uScale.value.set(sx, sy);
        u.uOffset.value.set(ox, oy);
        fill.mesh.visible = level > 0.002;
      }
      const filter = filterSourceRef?.current?.style.filter ?? "";
      if (canvas.style.filter !== filter) canvas.style.filter = filter;
      renderer.render(scene, camera);
    };
    // Modest devices (few cores / little memory) draw at ~30fps; the flow still reads smooth.
    const nav = navigator as Navigator & { deviceMemory?: number };
    const modest = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    const minFrameMs = modest ? 32 : 0;
    let lastFrame = 0;
    modestDpr = modest;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (!onScreen || t - lastFrame < minFrameMs) return;
      lastFrame = t;
      draw();
    };
    raf = requestAnimationFrame(frame);
    // Code that moves the page programmatically (e.g. the smooth horizontal scroller) fires
    // this right after moving it, so the water is redrawn in the same frame as the content.
    // Otherwise the two rAF loops can run in either order and the stream lags a frame behind.
    window.addEventListener(WATER_SYNC_EVENT, draw);

    return () => {
      cancelAnimationFrame(raf);
      seen.disconnect();
      far.disconnect();
      cancelRelease();
      canvas.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener(WATER_SYNC_EVENT, draw);
      for (const e of entries) {
        e.geo.dispose();
        e.core.dispose();
        e.glow.dispose();
      }
      if (fill) {
        fill.geo.dispose();
        fill.mat.uniforms.uMask.value.dispose();
        fill.mat.dispose();
      }
      // Free the GPU context now instead of waiting for GC: browsers cap live WebGL contexts (~16)
      // and kill the oldest ones, visible ones included, once the cap is hit.
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [svgRef, viewBox.w, viewBox.h, filterSourceRef, near, windowed]);

  return (
    <div
      ref={boxRef}
      aria-hidden
      style={{
        display: "block",
        pointerEvents: "none",
        ...(windowed ? { position: "absolute", left: 0, top: 0, width: "100%", height: "200vh" } : null),
        ...style,
      }}
    />
  );
}
