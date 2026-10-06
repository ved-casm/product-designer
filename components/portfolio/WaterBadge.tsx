"use client";

import { useRef, type CSSProperties } from "react";
import { BADGE_PATH } from "../paths";
import { useTheme } from "./theme";
import WaterStream from "./LazyWaterStream";

const VB = 267;
const VIEWBOX = { w: VB, h: VB };
const GLOW_PAD = 40;
/** How full the vessel ends up; leaves room to see the surface. */
const FILL_LEVEL = 0.78;

type Props = {
  size: number;
  /** Liquid colour near the surface. */
  fill: string;
  /** Liquid colour in the depths. */
  deep: string;
  drawn: boolean;
  filled: boolean;
  drawDuration?: number;
  label: string;
  labelStyle: CSSProperties;
};

/**
 * Badge whose outline is drawn by the water stream, then fills with realistic
 * coloured liquid (surface reflection, caustics, bubbles) - all in one WebGL canvas.
 */
export default function WaterBadge({ size, fill, deep, drawn, filled, drawDuration = 1200, label, labelStyle }: Props) {
  const { theme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const pad = (GLOW_PAD * size) / VB;

  return (
    <div style={{ position: "absolute", inset: 0, width: size, height: size }}>
      {/* Reference box that maps the badge's viewBox onto the screen. */}
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${VB} ${VB}`}
        fill="none"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        aria-hidden
      />
      <WaterStream
        svgRef={svgRef}
        viewBox={VIEWBOX}
        theme={theme}
        streams={[
          {
            d: BADGE_PATH,
            normalized: true,
            start: 0,
            end: drawn ? 1 : 0,
            duration: drawDuration,
            easing: "ease-in-out",
            width: 5,
            glowScale: 1.7,
            joinStart: true,
            joinEnd: true,
          },
        ]}
        liquid={{ level: filled ? FILL_LEVEL : 0, duration: 2400, color: fill, deep, mask: BADGE_PATH }}
        style={{ position: "absolute", left: -pad, top: -pad, width: size + pad * 2, height: size + pad * 2 }}
      />
      <p
        style={{
          ...labelStyle,
          position: "absolute",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          opacity: filled ? 1 : 0,
          transition: "opacity 500ms ease-out 900ms",
          textShadow: "0 1px 8px rgba(0,0,0,0.25)",
        }}
      >
        {label}
      </p>
    </div>
  );
}
