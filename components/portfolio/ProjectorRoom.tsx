"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Clock,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  Raycaster,
  RectAreaLight,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  TubeGeometry,
  Vector2,
  Vector3,
  VideoTexture,
  WebGLRenderer,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { hasWebGL, type WaterTheme } from "./water-shared";

/**
 * A home screening room. The camera starts on the ceiling looking straight down at the
 * floor (rug, sofa, pouf, coffee table, projector) and, as you scroll, swings down and
 * around to sit behind the sofa, square to the screen. The screen is a real area light,
 * and specks of dust drift out of the projector along the beam. Light theme = a sunlit
 * afternoon room, dark theme = lights off.
 */

export type Slide = { image: string; video?: string };

type Props = {
  slides: Slide[];
  index: number;
  theme: WaterTheme;
  onOpen: () => void;
  onSwipe: (dir: 1 | -1) => void;
  /** 0 → top-down from the ceiling, 1 → square in front of the screen. */
  progressRef?: { current: number };
  style?: CSSProperties;
  className?: string;
};

// Room layout (metres). The screen hangs on the back wall (z = BACK).
const W = 11;
const H = 4.6;
const BACK = -5;
const FRONT = 7;
const SCREEN = { x: 0, y: 2.55, z: BACK + 0.06, hw: 2.6, hh: 1.4625 };

/* ---------- procedural textures (bright bases, tinted per theme by material.color) ---------- */

// Painting these takes a few hundred milliseconds on a phone. Each one is painted once per page and cached,
// and warmRoom() paints them ahead of time in idle moments, so the room never stalls a scroll when it mounts.
type Painter = { w: number; h: number; draw: (g: CanvasRenderingContext2D, w: number, h: number) => void };
const baked = new Map<string, HTMLCanvasElement>();
const bake = (key: string) => {
  let c = baked.get(key);
  if (!c) {
    const p = PAINTERS[key];
    c = document.createElement("canvas");
    c.width = p.w;
    c.height = p.h;
    p.draw(c.getContext("2d")!, p.w, p.h);
    baked.set(key, c);
  }
  return c;
};

/** Paints every room texture ahead of time, one per idle moment. */
export function warmRoom() {
  const keys = Object.keys(PAINTERS).filter((k) => !baked.has(k));
  const next = () => {
    const k = keys.shift();
    if (!k) return;
    bake(k);
    if (window.requestIdleCallback) window.requestIdleCallback(next, { timeout: 2000 });
    else window.setTimeout(next, 50);
  };
  if (window.requestIdleCallback) window.requestIdleCallback(next, { timeout: 2000 });
  else window.setTimeout(next, 50);
}

/** A texture over a cached painting; tiled ones repeat. */
function tex(key: string, repeat = 0) {
  const t = new CanvasTexture(bake(key));
  if (key !== "shadow" && key !== "halo" && key !== "sun") t.colorSpace = SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(repeat, repeat);
  }
  if (key !== "shadow" && key !== "halo" && key !== "sun") t.anisotropy = 4;
  return t;
}

const rand = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const PAINTERS: Record<string, Painter> = {
  /** Oak planks. */
  wood: {
    w: 1024,
    h: 1024,
    draw(g, s) {
      const r = rand(7);
      const rows = 8;
      const h = s / rows;
      for (let y = 0; y < rows; y++) {
        let x = -r() * s * 0.5;
        while (x < s) {
          const len = s * (0.35 + r() * 0.45);
          const tone = 168 + r() * 34;
          g.fillStyle = `rgb(${tone + 22},${tone + 6},${tone - 22})`;
          g.fillRect(x, y * h, len, h - 2);
          for (let k = 0; k < 18; k++) {
            g.strokeStyle = `rgba(90,60,30,${0.06 + r() * 0.1})`;
            g.lineWidth = 1 + r() * 1.5;
            const gy = y * h + r() * h;
            g.beginPath();
            g.moveTo(x, gy);
            g.bezierCurveTo(x + len * 0.3, gy + (r() - 0.5) * 6, x + len * 0.7, gy + (r() - 0.5) * 6, x + len, gy);
            g.stroke();
          }
          g.fillStyle = "rgba(40,25,10,0.5)";
          g.fillRect(x + len - 2, y * h, 2, h);
          x += len;
        }
        g.fillStyle = "rgba(40,25,10,0.5)";
        g.fillRect(0, y * h + h - 2, s, 2);
      }
    },
  },
  /** Soft plaster. */
  plaster: {
    w: 512,
    h: 512,
    draw(g, s) {
      g.fillStyle = "#f2f2f2";
      g.fillRect(0, 0, s, s);
      const r = rand(3);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${0.2 + r() * 0.3})` : `rgba(0,0,0,${0.02 + r() * 0.04})`;
        const d = 1 + r() * 3;
        g.fillRect(r() * s, r() * s, d, d);
      }
    },
  },
  /** Hand-loomed rug: ivory with deep-blue bands and a fine weave. */
  rug: {
    w: 1024,
    h: 1024,
    draw(g, s) {
      g.fillStyle = "#e4ded2";
      g.fillRect(0, 0, s, s);
      g.fillStyle = "#1d3a5f";
      for (const b of [0.08, 0.14, 0.86, 0.92]) g.fillRect(0, b * s, s, s * 0.025);
      g.fillStyle = "#2f80ff";
      g.fillRect(0, 0.495 * s, s, s * 0.01);
      for (let i = 0; i < 6; i++) {
        g.save();
        g.translate(s * (0.1 + i * 0.16), s * 0.5);
        g.rotate(Math.PI / 4);
        g.strokeStyle = "#1d3a5f";
        g.lineWidth = 6;
        g.strokeRect(-26, -26, 52, 52);
        g.restore();
      }
      const r = rand(11);
      for (let i = 0; i < 40000; i++) {
        g.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
        g.fillRect(r() * s, r() * s, 2, 1);
      }
    },
  },
  /** Woven upholstery (white; the material colour dyes it). */
  fabric: {
    w: 256,
    h: 256,
    draw(g, s) {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 3) {
        g.fillStyle = `rgba(0,0,0,${y % 6 ? 0.04 : 0.08})`;
        g.fillRect(0, y, s, 1);
      }
      for (let x = 0; x < s; x += 3) {
        g.fillStyle = "rgba(0,0,0,0.05)";
        g.fillRect(x, 0, 1, s);
      }
    },
  },
  /** A fiddle-leaf fig leaf: violin-shaped, glossy, with a pale midrib and arching side veins. Transparent outside the leaf. */
  leaf: {
    w: 256,
    h: 384,
    draw(g, w, h) {
      // Outline: narrow at the stalk (bottom), widest near the top, a soft wavy edge and a short tip.
      const leaf = new Path2D();
      leaf.moveTo(w / 2, h - 4);
      leaf.bezierCurveTo(w * 0.3, h * 0.92, w * 0.16, h * 0.72, w * 0.2, h * 0.56);
      leaf.bezierCurveTo(w * 0.24, h * 0.44, w * 0.02, h * 0.36, w * 0.06, h * 0.2);
      leaf.bezierCurveTo(w * 0.1, h * 0.06, w * 0.36, h * 0.02, w / 2, 6);
      leaf.bezierCurveTo(w * 0.64, h * 0.02, w * 0.9, h * 0.06, w * 0.94, h * 0.2);
      leaf.bezierCurveTo(w * 0.98, h * 0.36, w * 0.76, h * 0.44, w * 0.8, h * 0.56);
      leaf.bezierCurveTo(w * 0.84, h * 0.72, w * 0.7, h * 0.92, w / 2, h - 4);
      g.save();
      g.clip(leaf);
      const body = g.createLinearGradient(0, h, w, 0);
      body.addColorStop(0, "#1c4426");
      body.addColorStop(0.55, "#2c6436");
      body.addColorStop(1, "#3f7d43");
      g.fillStyle = body;
      g.fillRect(0, 0, w, h);
      // Mottling so it doesn't read as flat plastic.
      const r = rand(17);
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = r() > 0.5 ? `rgba(120,170,90,${r() * 0.06})` : `rgba(0,30,10,${r() * 0.08})`;
        g.beginPath();
        g.arc(r() * w, r() * h, 2 + r() * 6, 0, Math.PI * 2);
        g.fill();
      }
      // Side veins arching up from the midrib toward the edge.
      g.lineCap = "round";
      for (let i = 0; i < 9; i++) {
        const y = h * (0.86 - i * 0.085);
        for (const side of [-1, 1]) {
          g.strokeStyle = "rgba(170,205,140,0.35)";
          g.lineWidth = 2.2 - i * 0.12;
          g.beginPath();
          g.moveTo(w / 2, y);
          g.quadraticCurveTo(w / 2 + side * w * 0.2, y - h * 0.04, w / 2 + side * w * 0.44, y - h * 0.12);
          g.stroke();
        }
      }
      // Midrib.
      g.strokeStyle = "rgba(196,222,160,0.85)";
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(w / 2, h);
      g.quadraticCurveTo(w / 2 + 4, h * 0.5, w / 2, h * 0.05);
      g.stroke();
      // Gloss: a soft highlight down one half.
      const shine = g.createLinearGradient(w * 0.2, 0, w * 0.6, 0);
      shine.addColorStop(0, "rgba(255,255,255,0)");
      shine.addColorStop(0.6, "rgba(230,255,220,0.12)");
      shine.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = shine;
      g.fillRect(0, 0, w, h);
      g.restore();
      // Darker rim.
      g.strokeStyle = "rgba(12,40,20,0.9)";
      g.lineWidth = 3;
      g.stroke(leaf);
    },
  },
  /** Soft round contact shadow. */
  shadow: {
    w: 128,
    h: 128,
    draw(g) {
      const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      grd.addColorStop(0, "rgba(0,0,0,0.7)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    },
  },
  /** Soft rectangular glow. */
  halo: {
    w: 256,
    h: 256,
    draw(g) {
      g.filter = "blur(28px)";
      g.fillStyle = "rgba(255,255,255,0.55)";
      g.fillRect(56, 56, 144, 144);
    },
  },
  /** A window's daylight falling on the floor (light theme only). */
  sun: {
    w: 256,
    h: 256,
    draw(g) {
      g.filter = "blur(6px)";
      g.fillStyle = "rgba(255,236,200,0.9)";
      for (let i = 0; i < 3; i++) g.fillRect(24 + i * 74, 20, 62, 216);
    },
  },
};

/* ---------- shaders: slide, beam, dust ---------- */

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; } return v; }
`;

const SCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const SCREEN_FRAG = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform vec2 uAspA;
  uniform vec2 uAspB;
  uniform float uMix;
  uniform float uTime;
  uniform float uGlitch;
  uniform float uBright;
  uniform float uReady;
  uniform float uNight;
  varying vec2 vUv;
  ${NOISE}
  // object-fit: cover onto a 16:9 screen, anchored to the top.
  vec2 cover(vec2 uv, vec2 asp) {
    vec2 s = vec2(1.0);
    float screen = 16.0 / 9.0;
    float img = asp.x / asp.y;
    if (img > screen) s.x = screen / img; else s.y = img / screen;
    return vec2((uv.x - 0.5) * s.x + 0.5, 1.0 - ((1.0 - uv.y) * s.y));
  }
  void main() {
    vec2 uv = vUv;
    float bar = step(0.82, noise(vec2(floor(uv.y * 38.0), floor(uTime * 24.0))));
    uv.x += (bar * 0.06 + (noise(vec2(uv.y * 90.0, uTime * 40.0)) - 0.5) * 0.01) * uGlitch;
    float ca = 0.006 * uGlitch;
    vec3 a = vec3(texture2D(uA, cover(uv + vec2(ca, 0.0), uAspA)).r, texture2D(uA, cover(uv, uAspA)).g, texture2D(uA, cover(uv - vec2(ca, 0.0), uAspA)).b);
    vec3 b = vec3(texture2D(uB, cover(uv + vec2(ca, 0.0), uAspB)).r, texture2D(uB, cover(uv, uAspB)).g, texture2D(uB, cover(uv - vec2(ca, 0.0), uAspB)).b);
    vec3 col = mix(a, b, smoothstep(0.0, 1.0, uMix));
    col = mix(vec3(0.9), col, uReady);
    float r = length((vUv - 0.5) * vec2(1.0, 0.75));
    col *= 1.06 - r * 0.45;
    col *= 0.97 + 0.03 * noise(vUv * vec2(640.0, 360.0));
    // In daylight a projection looks a touch washed out.
    col = mix(col * 0.86 + 0.08, col, uNight);
    gl_FragColor = vec4(col * uBright, 1.0);
  }
`;

const BEAM_VERT = /* glsl */ `
  attribute float aT;
  varying float vT;
  varying vec3 vWorld;
  void main() {
    vT = aT;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const BEAM_FRAG = /* glsl */ `
  uniform vec3 uSpill;
  uniform float uBright;
  uniform float uTime;
  uniform float uNight;
  varying float vT;
  varying vec3 vWorld;
  ${NOISE}
  void main() {
    float smoke = fbm(vWorld.xy * 1.1 + vec2(uTime * 0.05, uTime * 0.02)) * fbm(vWorld.zy * 1.4 - uTime * 0.03);
    float a = (0.035 + 0.11 * pow(1.0 - vT, 1.5)) * (0.4 + 1.5 * smoke) * smoothstep(0.0, 0.08, vT);
    a *= mix(0.55, 1.0, uNight);
    gl_FragColor = vec4(mix(vec3(0.85, 0.95, 1.0), uSpill, 0.5), a * uBright);
  }
`;

// Dust drifting out of the lens toward the screen, each speck on its own ray.
const DUST_VERT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uLens;
  uniform float uNight;
  attribute vec3 aTarget;
  attribute float aSeed;
  varying float vA;
  void main() {
    float t = fract(aSeed * 7.31 + uTime * (0.025 + 0.04 * aSeed));
    vec3 p = mix(uLens, aTarget, t);
    p.x += sin(uTime * 0.6 + aSeed * 40.0) * 0.05 * t;
    p.y += sin(uTime * 0.45 + aSeed * 17.0) * 0.07 * t;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed * 2.0) + aSeed * 50.0);
    vA = twinkle * smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.85, 1.0, t));
    gl_PointSize = (mix(30.0, 22.0, uNight) / -mv.z) * (0.5 + aSeed);
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAG = /* glsl */ `
  uniform float uBright;
  uniform float uNight;
  varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, r) * vA * uBright;
    // Night: glowing specks (additive). Day: warm motes catching the light.
    vec3 col = mix(vec3(1.0, 0.86, 0.6), vec3(0.9, 0.97, 1.0), uNight);
    gl_FragColor = vec4(col, a * mix(0.95, 0.7, uNight));
  }
`;

function averageColor(img: CanvasImageSource): Color {
  const c = document.createElement("canvas");
  c.width = c.height = 8;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, 8, 8);
  const d = ctx.getImageData(0, 0, 8, 8).data;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  return new Color(r / n / 255, g / n / 255, b / n / 255).lerp(new Color(0.8, 0.88, 1), 0.3);
}

type LoadedSlide = { tex: Texture; aspect: Vector2; color: Color; video?: HTMLVideoElement };

/** A cubic Bézier in 3D for the camera's swing. */
const bezier = (a: Vector3, b: Vector3, c: Vector3, d: Vector3, t: number, out: Vector3) => {
  const u = 1 - t;
  return out
    .copy(a)
    .multiplyScalar(u * u * u)
    .addScaledVector(b, 3 * u * u * t)
    .addScaledVector(c, 3 * u * t * t)
    .addScaledVector(d, t * t * t);
};

export default function ProjectorRoom({ slides, index, theme, onOpen, onSwipe, progressRef, style, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(index);
  const themeRef = useRef(theme);
  const cbRef = useRef({ onOpen, onSwipe });
  const progress = useRef(progressRef);
  // Client-only component (loaded with ssr: false), so the probe can run during the first render.
  const [noGL] = useState(() => !hasWebGL());
  const [failed, setFailed] = useState(false);
  const [near, setNear] = useState(false);

  useEffect(() => {
    indexRef.current = index;
    themeRef.current = theme;
    cbRef.current = { onOpen, onSwipe };
    progress.current = progressRef;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host || near) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "80% 0px" },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !near || noGL) return;
    const mobile = window.innerWidth < 768;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: !mobile, powerPreference: "high-performance" });
    } catch {
      // The renderer can only be created here, after mount; if the GPU refuses, show the fallback once.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    // Phones: dense screens hide aliasing, so no MSAA and a lower ratio keep this full-screen scene fluid.
    renderer.setPixelRatio(Math.min(mobile ? 1.25 : 1.75, window.devicePixelRatio || 1));
    // Reading shader logs after every compile makes the browser wait for it; only useful in dev.
    renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y";
    RectAreaLightUniformsLib.init();

    const scene = new Scene();
    scene.background = new Color();
    const camera = new PerspectiveCamera(50, 1, 0.05, 60);
    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

    // Everything that changes with the theme: [target, day colour, night colour].
    const themed: [Color, Color, Color][] = [];
    const tint = (c: Color, day: number, night: number) => themed.push([c, new Color(day), new Color(night)]);
    tint(scene.background as Color, 0xe9e4db, 0x050608);

    /* ----- shell ----- */
    const fabric = keep(tex("fabric", 3));
    const floorMat = keep(new MeshStandardMaterial({ map: keep(tex("wood", 3)), roughness: 0.38, metalness: 0.02 }));
    const wallMat = keep(new MeshStandardMaterial({ map: keep(tex("plaster", 4)), roughness: 0.95 }));
    const ceilMat = keep(new MeshStandardMaterial({ roughness: 1 }));
    const trim = keep(new MeshStandardMaterial({ roughness: 0.6 }));
    tint(floorMat.color, 0xffffff, 0x3a2c22);
    tint(wallMat.color, 0xe4ddd2, 0x1d2129);
    tint(ceilMat.color, 0xf3f0ea, 0x0c0d10);
    tint(trim.color, 0xf6f3ee, 0x0a0b0d);

    const depth = FRONT - BACK;
    const floor = new Mesh(new PlaneGeometry(W, depth), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (FRONT + BACK) / 2);
    const back = new Mesh(new PlaneGeometry(W, H), wallMat);
    back.position.set(0, H / 2, BACK);
    const left = new Mesh(new PlaneGeometry(depth, H), wallMat);
    left.rotation.y = Math.PI / 2;
    left.position.set(-W / 2, H / 2, (FRONT + BACK) / 2);
    const right = left.clone();
    right.rotation.y = -Math.PI / 2;
    right.position.x = W / 2;
    const ceiling = new Mesh(new PlaneGeometry(W, depth), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, H, (FRONT + BACK) / 2);
    const front = new Mesh(new PlaneGeometry(W, H), wallMat);
    front.rotation.y = Math.PI;
    front.position.set(0, H / 2, FRONT);
    scene.add(floor, back, left, right, ceiling, front);

    // Skirting.
    for (const [x, z, w, rot] of [
      [0, BACK + 0.01, W, 0],
      [-W / 2 + 0.01, (FRONT + BACK) / 2, depth, Math.PI / 2],
      [W / 2 - 0.01, (FRONT + BACK) / 2, depth, -Math.PI / 2],
    ] as const) {
      const sk = new Mesh(new PlaneGeometry(w, 0.12), trim);
      sk.position.set(x, 0.06, z);
      sk.rotation.y = rot;
      scene.add(sk);
    }

    // A tall window on the right wall, with sheer curtains (glows in daylight, dark at night).
    const windowMat = keep(new MeshBasicMaterial({ toneMapped: false }));
    tint(windowMat.color, 0xfff6e6, 0x0e1622);
    const win = new Mesh(new PlaneGeometry(2.4, 2.8), windowMat);
    win.rotation.y = -Math.PI / 2;
    win.position.set(W / 2 - 0.02, 1.9, 2.4);
    const frameMat = keep(new MeshStandardMaterial({ roughness: 0.5 }));
    tint(frameMat.color, 0xffffff, 0x111317);
    for (const [y, zz, h, w] of [
      [1.9, 1.2, 2.8, 0.06],
      [1.9, 3.6, 2.8, 0.06],
      [1.9, 2.4, 2.8, 0.04],
      [3.3, 2.4, 0.06, 2.46],
      [0.5, 2.4, 0.06, 2.46],
      [1.9, 2.4, 0.04, 2.4],
    ]) {
      const bar = new Mesh(new PlaneGeometry(w, h), frameMat);
      bar.rotation.y = -Math.PI / 2;
      bar.position.set(W / 2 - 0.03, y, zz);
      scene.add(bar);
    }
    const curtainMat = keep(new MeshStandardMaterial({ map: fabric, roughness: 1, side: DoubleSide, transparent: true }));
    tint(curtainMat.color, 0xf4ece0, 0x232833);
    for (const zz of [0.95, 3.85]) {
      const g = new PlaneGeometry(0.7, 3.6, 24, 1);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 22) * 0.04);
      g.computeVertexNormals();
      const curtain = new Mesh(g, curtainMat);
      curtain.rotation.y = -Math.PI / 2;
      curtain.position.set(W / 2 - 0.12, 2.0, zz);
      scene.add(curtain);
    }
    scene.add(win);
    // Sunlight patch on the floor below the window.
    const sunMat = keep(new MeshBasicMaterial({ map: keep(tex("sun")), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
    const sun = new Mesh(new PlaneGeometry(2.6, 2.4), sunMat);
    sun.rotation.set(-Math.PI / 2, 0, Math.PI / 2 + 0.15);
    sun.position.set(W / 2 - 1.9, 0.008, 2.6);
    scene.add(sun);

    /* ----- lights ----- */
    const hemi = new HemisphereLight(0xfff7ec, 0xb9a68c, 1);
    scene.add(hemi);
    const screenLight = new RectAreaLight(0xffffff, 6, SCREEN.hw * 2, SCREEN.hh * 2);
    screenLight.position.set(SCREEN.x, SCREEN.y, SCREEN.z + 0.02);
    screenLight.lookAt(SCREEN.x, SCREEN.y, FRONT);
    scene.add(screenLight);
    const windowLight = new RectAreaLight(0xfff1dc, 3, 2.4, 2.8);
    windowLight.position.set(W / 2 - 0.05, 1.9, 2.4);
    windowLight.lookAt(0, 1.6, 2.4);
    scene.add(windowLight);
    const lampLight = new PointLight(0xffb36b, 5, 7, 1.6);
    lampLight.position.set(-W / 2 + 1.1, 1.75, BACK + 1.2);
    scene.add(lampLight);

    /* ----- screen ----- */
    const blank = new Texture();
    const screenMat = keep(
      new ShaderMaterial({
        vertexShader: SCREEN_VERT,
        fragmentShader: SCREEN_FRAG,
        uniforms: {
          uA: { value: blank },
          uB: { value: blank },
          uAspA: { value: new Vector2(16, 9) },
          uAspB: { value: new Vector2(16, 9) },
          uMix: { value: 1 },
          uGlitch: { value: 0 },
          uTime: { value: 0 },
          uBright: { value: 1 },
          uReady: { value: 0 },
          uNight: { value: themeRef.current === "dark" ? 1 : 0 },
        },
        toneMapped: false,
      }),
    );
    const screen = new Mesh(new PlaneGeometry(SCREEN.hw * 2, SCREEN.hh * 2), screenMat);
    screen.position.set(SCREEN.x, SCREEN.y, SCREEN.z);
    const bezelMat = keep(new MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.5 }));
    const bezel = new Mesh(new RoundedBoxGeometry(SCREEN.hw * 2 + 0.14, SCREEN.hh * 2 + 0.14, 0.05, 2, 0.02), bezelMat);
    bezel.position.set(SCREEN.x, SCREEN.y, SCREEN.z - 0.03);
    scene.add(bezel, screen);
    // The picture's glow bleeding onto the wall around the screen (mostly visible with the lights off).
    const haloMat = keep(new MeshBasicMaterial({ map: keep(tex("halo")), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
    const halo = new Mesh(new PlaneGeometry(SCREEN.hw * 3.4, SCREEN.hh * 3.6), haloMat);
    halo.position.set(SCREEN.x, SCREEN.y, BACK + 0.01);
    scene.add(halo);

    /* ----- furniture ----- */
    const sofaMat = keep(new MeshStandardMaterial({ map: fabric, roughness: 0.9 }));
    const cushionMat = keep(new MeshStandardMaterial({ map: fabric, roughness: 0.92 }));
    const poufMat = keep(new MeshStandardMaterial({ map: fabric, roughness: 0.95 }));
    tint(sofaMat.color, 0x8d9a8b, 0x2b3442);
    tint(cushionMat.color, 0xb3bcad, 0x36404f);
    tint(poufMat.color, 0xc8925c, 0x7a5b3e);
    const woodDark = keep(new MeshStandardMaterial({ color: 0x3a281b, roughness: 0.55 }));
    const metal = keep(new MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.35, metalness: 0.6 }));
    const shadowMat = keep(new MeshBasicMaterial({ map: keep(tex("shadow")), transparent: true, depthWrite: false }));
    const contact = (x: number, z: number, sx: number, sz: number) => {
      const m = new Mesh(new PlaneGeometry(1, 1), shadowMat);
      m.rotation.x = -Math.PI / 2;
      m.scale.set(sx, sz, 1);
      m.position.set(x, 0.006, z);
      scene.add(m);
    };
    const rbox = (w: number, h: number, d: number, r = 0.06) => new RoundedBoxGeometry(w, h, d, 3, r);

    const rugMat = keep(new MeshStandardMaterial({ map: keep(tex("rug")), roughness: 1 }));
    tint(rugMat.color, 0xffffff, 0x8c8c8c);
    const rug = new Mesh(new PlaneGeometry(4.6, 3.2), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.004, 1.5);
    scene.add(rug);

    // Three-seat sofa facing the screen.
    const sofa = new Group();
    const SZ = 3.1;
    const base = new Mesh(rbox(2.7, 0.36, 1.0, 0.08), sofaMat);
    base.position.set(0, 0.28, 0);
    const backRest = new Mesh(rbox(2.7, 0.62, 0.26, 0.1), sofaMat);
    backRest.position.set(0, 0.68, 0.38);
    const armL = new Mesh(rbox(0.24, 0.6, 1.0, 0.09), sofaMat);
    armL.position.set(-1.35, 0.42, 0);
    const armR = armL.clone();
    armR.position.x = 1.35;
    sofa.add(base, backRest, armL, armR);
    for (const x of [-0.82, 0, 0.82]) {
      const seat = new Mesh(rbox(0.8, 0.16, 0.74, 0.07), cushionMat);
      seat.position.set(x, 0.53, -0.08);
      const pillow = new Mesh(rbox(0.74, 0.46, 0.18, 0.08), cushionMat);
      pillow.position.set(x, 0.86, 0.22);
      pillow.rotation.x = -0.18;
      sofa.add(seat, pillow);
    }
    // A throw blanket over the left arm.
    const throwMat = keep(new MeshStandardMaterial({ map: fabric, color: 0x2f80ff, roughness: 1 }));
    const blanket = new Mesh(rbox(0.5, 0.04, 1.02, 0.02), throwMat);
    blanket.position.set(-1.0, 0.63, 0);
    sofa.add(blanket);
    for (const [x, z] of [
      [-1.3, -0.4],
      [1.3, -0.4],
      [-1.3, 0.4],
      [1.3, 0.4],
    ]) {
      const foot = new Mesh(new CylinderGeometry(0.025, 0.02, 0.1, 10), woodDark);
      foot.position.set(x, 0.05, z);
      sofa.add(foot);
    }
    sofa.position.set(0, 0, SZ);
    scene.add(sofa);
    contact(0, SZ, 3.4, 1.6);

    const pouf = new Mesh(new CylinderGeometry(0.34, 0.36, 0.42, 40), poufMat);
    pouf.position.set(1.95, 0.21, 2.2);
    scene.add(pouf);
    contact(1.95, 2.2, 1.0, 1.0);

    // Coffee table with the projector on it.
    const TZ = 0.75;
    const tableTop = new Mesh(rbox(1.3, 0.05, 0.7, 0.02), woodDark);
    tableTop.position.set(0, 0.46, TZ);
    scene.add(tableTop);
    for (const [x, z] of [
      [-0.58, TZ - 0.3],
      [0.58, TZ - 0.3],
      [-0.58, TZ + 0.3],
      [0.58, TZ + 0.3],
    ]) {
      const leg = new Mesh(new CylinderGeometry(0.018, 0.018, 0.44, 8), metal);
      leg.position.set(x, 0.22, z);
      scene.add(leg);
    }
    contact(0, TZ, 1.7, 1.1);
    // A mug and a couple of books on the table.
    const mug = new Mesh(new CylinderGeometry(0.045, 0.04, 0.1, 20), keep(new MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.4 })));
    mug.position.set(-0.45, 0.535, TZ + 0.15);
    const book1 = new Mesh(rbox(0.3, 0.035, 0.22, 0.005), keep(new MeshStandardMaterial({ color: 0x1d3a5f, roughness: 0.8 })));
    book1.position.set(0.42, 0.5, TZ + 0.12);
    book1.rotation.y = 0.2;
    const book2 = new Mesh(rbox(0.26, 0.03, 0.2, 0.005), keep(new MeshStandardMaterial({ color: 0xd9a441, roughness: 0.8 })));
    book2.position.set(0.43, 0.533, TZ + 0.12);
    book2.rotation.y = -0.1;
    scene.add(mug, book1, book2);

    const projBody = new Mesh(rbox(0.42, 0.16, 0.34, 0.04), keep(new MeshStandardMaterial({ color: 0xeeeeef, roughness: 0.35 })));
    projBody.position.set(0, 0.565, TZ - 0.05);
    const lensRing = new Mesh(new CylinderGeometry(0.065, 0.075, 0.06, 32), metal);
    lensRing.rotation.x = Math.PI / 2;
    lensRing.position.set(0.09, 0.57, TZ - 0.23);
    const lensGlass = new Mesh(new CircleGeometry(0.052, 32), keep(new MeshBasicMaterial({ color: 0xe6f8ff, toneMapped: false })));
    lensGlass.position.set(0.09, 0.57, TZ - 0.262);
    lensGlass.rotation.y = Math.PI;
    const ledMat = keep(new MeshBasicMaterial({ color: 0x22c6ff, toneMapped: false }));
    const led = new Mesh(new SphereGeometry(0.01, 10, 10), ledMat);
    led.position.set(-0.14, 0.65, TZ - 0.2);
    scene.add(projBody, lensRing, lensGlass, led);
    const lens = new Vector3(0.09, 0.57, TZ - 0.27);

    // Floor lamp (back-left corner).
    const lampPole = new Mesh(new CylinderGeometry(0.015, 0.015, 1.6, 8), metal);
    lampPole.position.set(lampLight.position.x, 0.8, lampLight.position.z);
    const lampBase = new Mesh(new CylinderGeometry(0.16, 0.18, 0.03, 24), metal);
    lampBase.position.set(lampLight.position.x, 0.015, lampLight.position.z);
    const shadeMat = keep(new MeshStandardMaterial({ color: 0xf2dcc0, emissive: 0xffb36b, emissiveIntensity: 1.2, side: DoubleSide, roughness: 1 }));
    const shade = new Mesh(new CylinderGeometry(0.2, 0.28, 0.32, 32, 1, true), shadeMat);
    shade.position.set(lampLight.position.x, 1.75, lampLight.position.z);
    scene.add(lampPole, lampBase, shade);
    contact(lampLight.position.x, lampLight.position.z, 0.7, 0.7);

    // Tower speakers flanking the screen.
    const speakerMat = keep(new MeshStandardMaterial({ color: 0x141518, roughness: 0.5 }));
    const coneMat = keep(new MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.4, metalness: 0.3 }));
    for (const x of [-3.35, 3.35]) {
      const tower = new Mesh(rbox(0.32, 1.15, 0.34, 0.03), speakerMat);
      tower.position.set(x, 0.575, BACK + 0.45);
      scene.add(tower);
      for (const y of [0.35, 0.68, 0.95]) {
        const r = y > 0.9 ? 0.04 : 0.09;
        const cone = new Mesh(new CylinderGeometry(r, r, 0.02, 24), coneMat);
        cone.rotation.x = Math.PI / 2;
        cone.position.set(x, y, BACK + 0.63);
        scene.add(cone);
      }
      contact(x, BACK + 0.45, 0.7, 0.7);
    }

    // A fiddle-leaf fig in the back-right corner: a trunk, two branches and big textured leaves.
    const pot = new Mesh(new CylinderGeometry(0.22, 0.17, 0.42, 32), keep(new MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.8 })));
    pot.position.set(W / 2 - 0.9, 0.21, BACK + 1.0);
    scene.add(pot);
    const soil = new Mesh(new CircleGeometry(0.205, 32), keep(new MeshStandardMaterial({ color: 0x2a1d14, roughness: 1 })));
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(pot.position.x, 0.4, pot.position.z);
    scene.add(soil);
    contact(pot.position.x, pot.position.z, 0.8, 0.8);

    const plant = new Group();
    plant.position.set(pot.position.x, 0, pot.position.z);
    scene.add(plant);
    const barkMat = keep(new MeshStandardMaterial({ color: 0x5b4836, roughness: 0.9 }));
    const leafTex = keep(tex("leaf"));
    const leafMats = [0xffffff, 0xd8e8cf, 0xbfd6b4].map((c) =>
      keep(new MeshStandardMaterial({ map: leafTex, color: c, alphaTest: 0.5, side: DoubleSide, roughness: 0.45 })),
    );
    // Each leaf: a plane bent along its length (droop) and across it (cupped), base at the origin.
    const leafGeo = (() => {
      const g = new PlaneGeometry(0.28, 0.38, 6, 10);
      g.translate(0, 0.19 + 0.04, 0);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        // After the pivot tilts the leaf outward, local +Z points down: the tip droops, the edges curl up.
        pos.setZ(i, 1.0 * y * y - 1.2 * x * x);
      }
      g.computeVertexNormals();
      return g;
    })();
    const petioleGeo = new CylinderGeometry(0.006, 0.008, 0.05, 6);
    petioleGeo.translate(0, 0.025, 0);
    const branch = (points: Vector3[], radius: number) => {
      const curve = new CatmullRomCurve3(points);
      plant.add(new Mesh(new TubeGeometry(curve, 24, radius, 8, false), barkMat));
      return curve;
    };
    const trunk = branch([new Vector3(0, 0.38, 0), new Vector3(0.03, 0.9, -0.02), new Vector3(-0.02, 1.45, 0.02), new Vector3(0.02, 1.85, 0)], 0.024);
    const branchL = branch([new Vector3(0.01, 1.0, 0), new Vector3(-0.16, 1.3, 0.05), new Vector3(-0.24, 1.6, 0.08)], 0.014);
    const branchR = branch([new Vector3(0.0, 1.15, 0), new Vector3(0.17, 1.4, 0.06), new Vector3(0.22, 1.7, 0.02)], 0.013);

    const leafR = rand(5);
    const GOLDEN = 2.39996;
    let n = 0;
    const leavesOn = (curve: CatmullRomCurve3, from: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const t = from + ((1 - from) * (i + 0.5)) / count;
        const node = curve.getPoint(t);
        const pivot = new Group();
        pivot.position.copy(node);
        pivot.rotation.order = "YXZ";
        pivot.rotation.y = n++ * GOLDEN + leafR() * 0.4;
        // Younger leaves near the top stand up; older ones lower down lean out further.
        pivot.rotation.x = 0.4 + (1 - t) * 0.7 + leafR() * 0.3;
        pivot.rotation.z = (leafR() - 0.5) * 0.9;
        const s = 0.9 + t * 0.3 + leafR() * 0.2;
        pivot.scale.setScalar(s);
        pivot.add(new Mesh(petioleGeo, barkMat), new Mesh(leafGeo, leafMats[Math.floor(leafR() * leafMats.length)]));
        plant.add(pivot);
      }
    };
    leavesOn(trunk, 0.42, 16);
    leavesOn(branchL, 0.3, 10);
    leavesOn(branchR, 0.3, 10);
    // A crown leaf right at the tip.
    leavesOn(trunk, 0.98, 1);

    // Picture frames on the left wall.
    const frameDark = keep(new MeshStandardMaterial({ color: 0x15161a, roughness: 0.5 }));
    const artMats = [0x2f80ff, 0xd9a441, 0x8d9a8b].map((c) => keep(new MeshStandardMaterial({ color: c, roughness: 0.9 })));
    ([
      [1.6, 0.9, 1.1],
      [3.1, 0.7, 0.9],
      [4.3, 0.7, 0.9],
    ] as const).forEach(([zz, w, h], i) => {
      const f = new Mesh(rbox(0.04, h + 0.08, w + 0.08, 0.01), frameDark);
      f.position.set(-W / 2 + 0.03, 2.2, zz);
      const art = new Mesh(new PlaneGeometry(w, h), artMats[i]);
      art.rotation.y = Math.PI / 2;
      art.position.set(-W / 2 + 0.056, 2.2, zz);
      scene.add(f, art);
    });

    /* ----- beam + dust ----- */
    const corners = [
      [SCREEN.x - SCREEN.hw, SCREEN.y - SCREEN.hh],
      [SCREEN.x + SCREEN.hw, SCREEN.y - SCREEN.hh],
      [SCREEN.x + SCREEN.hw, SCREEN.y + SCREEN.hh],
      [SCREEN.x - SCREEN.hw, SCREEN.y + SCREEN.hh],
    ].map(([x, y]) => new Vector3(x, y, SCREEN.z + 0.03));
    const bPos: number[] = [];
    const bT: number[] = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      bPos.push(lens.x, lens.y, lens.z, a.x, a.y, a.z, b.x, b.y, b.z);
      bT.push(0, 1, 1);
    }
    const beamGeo = new BufferGeometry();
    beamGeo.setAttribute("position", new BufferAttribute(new Float32Array(bPos), 3));
    beamGeo.setAttribute("aT", new BufferAttribute(new Float32Array(bT), 1));
    const night = { value: themeRef.current === "dark" ? 1 : 0 };
    screenMat.uniforms.uNight = night;
    const shared = {
      uSpill: { value: new Color(0.8, 0.88, 1) },
      uBright: screenMat.uniforms.uBright,
      uTime: screenMat.uniforms.uTime,
      uNight: night,
      uLens: { value: lens },
    };
    const beam = new Mesh(
      beamGeo,
      keep(new ShaderMaterial({ vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, uniforms: shared, transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending })),
    );
    scene.add(beam);
    const DUST = mobile ? 260 : 520;
    const dTarget = new Float32Array(DUST * 3);
    const dSeed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      const u = Math.random();
      const v = Math.random();
      const onScreen = corners[0].clone().lerp(corners[1], u).lerp(corners[3].clone().lerp(corners[2], u), v);
      dTarget.set([onScreen.x, onScreen.y, onScreen.z], i * 3);
      dSeed[i] = Math.random();
    }
    const dustGeo = new BufferGeometry();
    // Positions are computed in the shader; the attribute only sets the count and bounds.
    dustGeo.setAttribute("position", new BufferAttribute(dTarget.slice(), 3));
    dustGeo.setAttribute("aTarget", new BufferAttribute(dTarget, 3));
    dustGeo.setAttribute("aSeed", new BufferAttribute(dSeed, 1));
    const dustMat = keep(new ShaderMaterial({ vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, uniforms: shared, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    const dust = new Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    scene.add(dust);

    const applyTheme = (n: number) => {
      for (const [c, day, nightC] of themed) c.lerpColors(day, nightC, n);
      hemi.intensity = 1.35 * (1 - n) + 0.03 * n;
      windowLight.intensity = 4 * (1 - n);
      sunMat.opacity = 0.55 * (1 - n);
      haloMat.opacity = 0.12 + 0.5 * n;
      lampLight.intensity = 1.5 + 3.5 * n;
      shadeMat.emissiveIntensity = 0.5 + 0.9 * n;
      renderer.toneMappingExposure = 1.15 - 0.15 * (1 - n);
      const wantBlend = n > 0.5 ? AdditiveBlending : NormalBlending;
      if (dustMat.blending !== wantBlend) {
        dustMat.blending = wantBlend;
        dustMat.needsUpdate = true;
      }
    };
    applyTheme(night.value);

    /* ----- slides ----- */
    const loader = new TextureLoader();
    const cache = new Map<number, Promise<LoadedSlide>>();
    const load = (i: number) => {
      if (!cache.has(i)) {
        cache.set(
          i,
          new Promise<LoadedSlide>((resolve) => {
            const s = slides[i];
            // Phones show the screen small; the 800px twin (npm run media) is plenty there.
            loader.load(mobile ? s.image.replace(/\.webp$/, "-800w.webp") : s.image, (tex) => {
              tex.minFilter = LinearFilter;
              tex.generateMipmaps = false;
              tex.colorSpace = SRGBColorSpace;
              const img = tex.image as HTMLImageElement;
              const out: LoadedSlide = { tex, aspect: new Vector2(img.width, img.height), color: averageColor(img) };
              if (s.video) {
                const v = document.createElement("video");
                v.src = s.video;
                v.muted = true;
                v.loop = true;
                v.playsInline = true;
                v.preload = "auto";
                out.video = v;
              }
              resolve(out);
            });
          }),
        );
      }
      return cache.get(i)!;
    };
    let shown = -1;
    let current: LoadedSlide | null = null;
    let switchT = 1;
    const spillFrom = new Color();
    const spillTo = new Color(0.8, 0.88, 1);
    const show = async (i: number) => {
      const next = await load(i);
      if (indexRef.current !== i) return;
      load((i + 1) % slides.length);
      if (current?.video) current.video.pause();
      let tex: Texture = next.tex;
      if (next.video) {
        next.video.currentTime = 0;
        next.video.play().catch(() => {});
        const vt = new VideoTexture(next.video);
        vt.colorSpace = SRGBColorSpace;
        tex = vt;
      }
      const u = screenMat.uniforms;
      u.uA.value = current ? u.uB.value : tex;
      u.uAspA.value.copy(current ? u.uAspB.value : next.aspect);
      u.uB.value = tex;
      u.uAspB.value.copy(next.aspect);
      u.uReady.value = 1;
      spillFrom.copy(shared.uSpill.value);
      spillTo.copy(next.color);
      switchT = current ? 0 : 1;
      if (!current) shared.uSpill.value.copy(next.color);
      current = next;
    };

    /* ----- camera: on the ceiling looking down → swing → behind the sofa, square to the screen ----- */
    const camA = new Vector3(0, H - 0.2, 1.7);
    const camB = new Vector3(0, H - 0.5, 6.6);
    const camC = new Vector3(0, 2.0, 7.6);
    const camD = new Vector3(0, 1.6, 6.7);
    const lookA = new Vector3(0, 0, 1.65);
    const lookD = new Vector3(0, SCREEN.y - 0.15, SCREEN.z);
    const upA = new Vector3(0, 0, -1); // screen wall at the top of the frame while looking down
    const upD = new Vector3(0, 1, 0);
    const camPos = new Vector3();
    const look = new Vector3();
    const up = new Vector3();
    let p = progress.current?.current ?? 0;
    let fovEnd = 50;
    let fovStart = 70;

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // End: whole screen (plus speakers) in frame. Start: the rug + sofa fill the frame.
      const dist = camD.z - SCREEN.z;
      fovEnd = Math.max(42, Math.min(80, 2 * Math.atan((SCREEN.hw + 0.9) / dist / camera.aspect) * (180 / Math.PI)));
      fovStart = Math.max(62, Math.min(95, 2 * Math.atan(2.6 / (H - 0.2) / Math.min(1, camera.aspect)) * (180 / Math.PI)));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    /* ----- input ----- */
    const ray = new Raycaster();
    const ndc = new Vector2();
    const pointer = { x: 0, y: 0 };
    let down: { x: number; y: number } | null = null;
    const toNdc = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      pointer.x = ndc.x;
      pointer.y = ndc.y;
    };
    const overScreen = () => {
      ray.setFromCamera(ndc, camera);
      return p > 0.8 && ray.intersectObject(screen).length > 0;
    };
    const onMove = (e: PointerEvent) => {
      toNdc(e);
      host.style.cursor = overScreen() ? "pointer" : "";
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      down = null;
      if (p > 0.8 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        cbRef.current.onSwipe(dx < 0 ? 1 : -1);
        return;
      }
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        toNdc(e);
        if (overScreen()) cbRef.current.onOpen();
      }
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    // A vertical scroll on touch hands the gesture to the browser; forget it.
    const onCancel = () => (down = null);
    window.addEventListener("pointercancel", onCancel);

    let active = false;
    const io = new IntersectionObserver(([e]) => {
      active = e.isIntersecting;
      if (current?.video) {
        if (active) current.video.play().catch(() => {});
        else current.video.pause();
      }
    });
    io.observe(host);

    const clock = new Clock();
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!active || document.hidden) return;
      const dt = Math.min(0.05, clock.getDelta());
      const t = (screenMat.uniforms.uTime.value += dt);
      if (shown !== indexRef.current) {
        shown = indexRef.current;
        show(indexRef.current);
      }

      const nightTarget = themeRef.current === "dark" ? 1 : 0;
      if (Math.abs(night.value - nightTarget) > 0.001) {
        night.value += (nightTarget - night.value) * Math.min(1, dt * 4);
        applyTheme(night.value);
      }

      if (switchT < 1) {
        switchT = Math.min(1, switchT + dt / 0.9);
        const k = switchT;
        screenMat.uniforms.uMix.value = Math.min(1, Math.max(0, (k - 0.25) / 0.5));
        screenMat.uniforms.uGlitch.value = Math.sin(Math.PI * Math.min(1, k * 1.4));
        shared.uSpill.value.copy(spillFrom).lerp(spillTo, k);
        shared.uBright.value = 1 - 0.55 * Math.sin(Math.PI * k) + (Math.random() - 0.5) * 0.2 * Math.sin(Math.PI * k);
      } else {
        screenMat.uniforms.uMix.value = 1;
        screenMat.uniforms.uGlitch.value = 0;
        shared.uBright.value = 1 + Math.sin(t * 37.0) * 0.005;
      }
      screenLight.color.copy(shared.uSpill.value);
      haloMat.color.copy(shared.uSpill.value).multiplyScalar(shared.uBright.value);
      screenLight.intensity = (3 + 4 * night.value) * shared.uBright.value;
      ledMat.color.setHSL(0.53, 0.9, 0.45 + 0.2 * Math.sin(t * 2.4));

      // Dolly along the scroll, eased so it glides rather than jumps.
      const want = progress.current?.current ?? 1;
      p += (want - p) * Math.min(1, dt * 3.5);
      const k = p * p * (3 - 2 * p);
      bezier(camA, camB, camC, camD, k, camPos);
      look.lerpVectors(lookA, lookD, Math.min(1, k * 1.15));
      up.lerpVectors(upA, upD, Math.min(1, k * 1.6)).normalize();
      const sway = k * k;
      camera.position.set(camPos.x + pointer.x * 0.35 * sway, camPos.y + pointer.y * 0.12 * sway, camPos.z);
      camera.up.copy(up);
      camera.lookAt(look);
      const fov = fovStart + (fovEnd - fovStart) * Math.min(1, k * 1.3);
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      cache.forEach((pr) =>
        pr.then((s) => {
          s.tex.dispose();
          s.video?.pause();
        }),
      );
      scene.traverse((o) => (o as Mesh).geometry?.dispose());
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      // Release the GPU context now; browsers cap live WebGL contexts and drop the oldest.
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [near, slides, noGL]);

  return (
    <div
      ref={hostRef}
      className={`${className ?? ""}${failed || noGL ? " room-fallback" : ""}`}
      style={{ position: "relative", overflow: "hidden", ...style }}
      aria-hidden
    />
  );
}
