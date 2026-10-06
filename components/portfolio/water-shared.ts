// Types and constants shared by the water components - kept free of three.js so
// importing them never pulls the WebGL bundle into the main chunk.

export type Easing = "linear" | "ease-out" | "ease-in-out";

export type Stream = {
  /** SVG path data, in the reference SVG's viewBox units. */
  d: string;
  /** Visible range along the path. Normalised 0..1 when `normalized`, else in path-length units. */
  start: number;
  end: number;
  normalized?: boolean;
  /** How long the visible range takes to reach a new target (mimics a CSS transition). */
  duration: number;
  easing: Easing;
  /** Core width of the stream in viewBox units. */
  width: number;
  /** Glow halo width as a multiple of the core width (default 3.2). */
  glowScale?: number;
  /** The path continues into another stream at its start / end, so don't taper there. */
  joinStart?: boolean;
  joinEnd?: boolean;
};

export type WaterTheme = "light" | "dark";

/** Dispatch on window after moving content programmatically to redraw the water immediately. */
export const WATER_SYNC_EVENT = "water-sync";

export type Liquid = {
  /** Target fill level, 0 (empty) .. 1 (full). */
  level: number;
  /** How long the fill takes to reach a new level, in ms. */
  duration: number;
  /** Liquid colour near the surface and in the depths. */
  color: string;
  deep: string;
  /** Vessel outline (SVG path in viewBox units); the liquid is clipped to it. */
  mask: string;
};

let webgl: boolean | null = null;
/** Probed once per page: when WebGL is unavailable every water component skips quietly. */
export function hasWebGL() {
  if (webgl === null) {
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}
