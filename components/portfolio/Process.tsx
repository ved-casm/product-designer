"use client";

import { useEffect, useRef, useState } from "react";
import { samplePath } from "../pathUtils";
import { useIsMobile } from "../useIsMobile";
import { PROCESS } from "./content";
import { ForceTheme, type, V } from "./theme";
import WaterBadge from "./WaterBadge";
import WaterStream from "./LazyWaterStream";

type Geometry = {
  w: number;
  h: number;
  d: string;
  nodeAt: number[];
  samples: { y: number; s: number }[];
  length: number;
};

/** Smooth meandering path that starts at the top of the track and threads every node centre. */
function buildPath(
  nodes: { x: number; y: number }[],
  w: number,
  h: number,
  amp: number,
) {
  const start = { x: nodes[0].x, y: 0 };
  const end = { x: nodes[nodes.length - 1].x, y: h };
  const pts = [start, ...nodes, end];
  let d = `M${start.x} ${start.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dy = b.y - a.y;
    const dir = i % 2 === 0 ? 1 : -1;
    const bend = Math.min(amp, w / 2 - 8);
    d += ` C${a.x + bend * dir} ${a.y + dy * 0.4} ${b.x + bend * dir} ${b.y - dy * 0.4} ${b.x} ${b.y}`;
  }
  return d;
}

function StepVideo({
  src,
  poster,
  title,
}: {
  src: string;
  poster: string;
  title: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      className="process-video"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={`${title} - process clip`}
    />
  );
}

export default function Process() {
  const isMobile = useIsMobile();
  const trackRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [head, setHead] = useState(0);
  const NODE = isMobile ? 64 : 150;

  // Lay the path through the measured node centres; redo on resize.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      // Refs go null while React swaps the nodes; skip that frame instead of throwing.
      if (nodeRefs.current.some((n) => !n?.isConnected)) return;
      const t = track.getBoundingClientRect();
      const nodes = (nodeRefs.current as HTMLDivElement[]).map((n) => {
        const r = n.getBoundingClientRect();
        return {
          x: r.left - t.left + r.width / 2,
          y: r.top - t.top + r.height / 2,
        };
      });
      if (!nodes.length || t.width === 0) return;
      const d = buildPath(nodes, t.width, t.height, isMobile ? 26 : 240);
      // Sampled in JS: SVGPathElement.getPointAtLength is slow and this re-runs on resize.
      const { pts, length } = samplePath(d, 8);
      const samples = pts.map((q) => ({ y: q.y, s: q.s }));
      // Arc length at which the path reaches each node.
      const nodeAt = nodes.map((n) => samples.find((q) => q.y >= n.y - 1)?.s ?? length);
      setGeo({ w: t.width, h: t.height, d, nodeAt, samples, length });
    };
    // Re-measure at most once a frame, and only when the track really changed size
    // (images and videos loading above it fire the observer many times).
    let raf = 0;
    let lastW = -1;
    let lastH = -1;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const { width, height } = track.getBoundingClientRect();
        if (width === lastW && height === lastH) return;
        lastW = width;
        lastH = height;
        measure();
      });
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(track);
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile]);

  // The stream's head follows a line ~62% down the viewport.
  useEffect(() => {
    if (!geo) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const t = trackRef.current?.getBoundingClientRect();
      if (!t) return;
      const y = window.innerHeight * 0.62 - t.top;
      let s = 0;
      if (y >= geo.h) s = geo.length;
      else if (y > 0) {
        const i = geo.samples.findIndex((q) => q.y >= y);
        s = i <= 0 ? 0 : geo.samples[i].s;
      }
      setHead(s);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [geo]);

  // Blur-in reveal for each stage's copy and media.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const els = Array.from(
      track.querySelectorAll<HTMLElement>(".process-copy, .process-media"),
    );
    els.forEach((el) => el.classList.add("appear"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) =>
          e.target.classList.toggle("is-visible", e.isIntersecting),
        ),
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isMobile]);

  return (
    // Always dark: the process clips are shot on pure black, so the section matches them.
    <ForceTheme theme="dark">
      <section
        id="process-section"
        className="process"
        aria-labelledby="process-heading"
      >
        {geo && (
          <WaterStream
            svgRef={svgRef}
            viewBox={{ w: geo.w, h: geo.h }}
            theme="dark"
            streams={[
              {
                d: geo.d,
                start: 0,
                end: head,
                duration: 600,
                easing: "ease-out",
                width: 7,
                joinStart: true,
              },
            ]}
            windowed
            style={{ zIndex: 0 }}
          />
        )}

        <header className="process-head">
          <p style={{ ...type.bodyM, color: V.tertiary }}>{PROCESS.eyebrow}</p>
          <h2
            id="process-heading"
            style={{ ...type.displayXL, color: V.primary, marginTop: 12 }}
          >
            {PROCESS.heading[0]}
            <br />
            <span style={{ fontStyle: "italic", color: V.accent }}>
              {PROCESS.heading[1]}
            </span>
          </h2>
          <p
            style={{
              ...type.bodyL,
              marginTop: 16,
              maxWidth: 520,
              marginInline: "auto",
            }}
          >
            {PROCESS.sub}
          </p>
        </header>

        <div ref={trackRef} className="process-track">
          <svg
            ref={svgRef}
            className="process-svg"
            viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : "0 0 1 1"}
            preserveAspectRatio="none"
            aria-hidden
          >
          </svg>

          {PROCESS.steps.map((step, i) => {
            const at = geo?.nodeAt[i] ?? Infinity;
            const reached = head >= at - 40;
            const filled = head >= at + 50;
            const flip = !isMobile && i % 2 === 1;
            return (
              <div
                key={step.title}
                className={`process-row${flip ? " process-row--flip" : ""}`}
              >
                <div className="process-copy">
                  <p className="process-num">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="process-title" style={{ color: V.primary }}>
                    {step.title}
                  </h3>
                  <p style={{ ...type.bodyL, marginTop: 12, maxWidth: 420 }}>
                    {step.body}
                  </p>
                </div>
                <div
                  className="process-node"
                  ref={(el) => {
                    nodeRefs.current[i] = el;
                  }}
                  style={{ width: NODE, height: NODE }}
                >
                  <WaterBadge
                    size={NODE}
                    fill={step.color}
                    deep={step.deep}
                    drawn={reached}
                    filled={filled}
                    drawDuration={900}
                    label={String(i + 1).padStart(2, "0")}
                    labelStyle={{
                      ...type.titleM,
                      fontSize: isMobile ? 15 : 22,
                      color: V.primary,
                      left: NODE / 2,
                      top: NODE / 2 - (isMobile ? 9 : 13),
                    }}
                  />
                </div>
                <div className="process-media">
                  <StepVideo
                    src={step.video}
                    poster={step.poster}
                    title={step.title}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </ForceTheme>
  );
}
