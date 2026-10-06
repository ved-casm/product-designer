"use client";

import { useEffect, useRef, useState } from "react";
import Picture from "../Picture";
import { MOBILE_STRING_PATHS } from "../paths";
import { merge, WEIGHT } from "../typography";
import { HERO, HOBBIES, OWNERSHIP, PASSIONS, TIMELINE, VENN } from "./content";
import { type, useTheme, V } from "./theme";
import WaterBadge from "./WaterBadge";
import WaterStream from "./LazyWaterStream";
import type { Stream } from "./water-shared";

const ARTBOARD_W = 393;
const ARTBOARD_H = 5120;
const TOP_CROP = 100;
const VIEWBOX = { w: 336, h: 4723 };

const SEGMENTS = [
  { reversed: false, weight: 0 },
  { reversed: true, weight: 1140 },
  { reversed: false, weight: 248 },
  { reversed: false, weight: 241 },
  { reversed: false, weight: 2069 },
];

const MILESTONE_SLOTS = [
  { x: 48, y: 3130, w: 203 },
  { x: 61, y: 3239, w: 261 },
  { x: 79, y: 3379, w: 236 },
  { x: 87, y: 3519, w: 227 },
  { x: 78, y: 3659, w: 234 },
  { x: 66, y: 3806, w: 248 },
  { x: 58, y: 3951, w: 242 },
];

const HOBBY_SLOTS = [
  { left: 30, top: 1050, size: 92, rot: -12.6 },
  { left: 70, top: 1180, size: 108, rot: 9.79 },
  { left: 236, top: 1172, size: 100, rot: 0 },
  { left: 60, top: 1508, size: 86, rot: 0 },
  { left: 250, top: 1520, size: 78, rot: -7.4 },
  { left: 54, top: 1664, size: 82, rot: 0 },
];

const PASSION_SLOTS = [
  { img: { left: 155, top: 2059, size: 126, rot: 11.31 }, text: { left: 153, top: 2182 } },
  { img: { left: 20, top: 2345, size: 130, rot: -6.94 }, text: { left: 34, top: 2484 } },
  { img: { left: 152, top: 2585, size: 122, rot: -2.45 }, text: { left: 165, top: 2719 } },
];

const TITLE_GAP = Math.round(20 * 1.2) + 4;

/** Types a message out character by character, like the desktop cursor bubble. */
function useTyped(text: string) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    let i = 0;
    let t = 0;
    const step = () => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i < text.length) t = window.setTimeout(step, 26 + Math.random() * 30);
    };
    t = window.setTimeout(step, 120);
    return () => window.clearTimeout(t);
  }, [text]);
  return typed;
}

const ARTBOARD_PAD = 10;

/** Speech bubble that pops out above a tapped image on touch screens. */
function TapBubble({ text, slot, below }: { text: string; slot: { left: number; top: number; size: number }; below: boolean }) {
  const typed = useTyped(text);
  const cx = slot.left + slot.size / 2;
  const align = cx < 140 ? "left" : cx > ARTBOARD_W - 140 ? "right" : "center";
  // Open above the image, or below it when the image sits under the nav.
  const ty = below ? "0" : "-100%";
  const pos =
    align === "left"
      ? { left: Math.max(ARTBOARD_PAD, slot.left), transform: `translateY(${ty})` }
      : align === "right"
        ? { right: Math.max(ARTBOARD_PAD, ARTBOARD_W - slot.left - slot.size), transform: `translateY(${ty})` }
        : { left: cx, transform: `translate(-50%, ${ty})` };
  const corner = below ? (align === "left" ? "2px 24px 24px 24px" : align === "right" ? "24px 2px 24px 24px" : "24px") : align === "left" ? "24px 24px 24px 2px" : align === "right" ? "24px 24px 2px 24px" : "24px";
  return (
    <div
      role="status"
      className="tap-bubble"
      style={{
        position: "absolute",
        top: below ? slot.top + slot.size + 8 : slot.top - 8,
        ...pos,
        borderRadius: corner,
      }}
    >
      {typed}
      <span className="tap-bubble-caret" style={{ opacity: typed.length < text.length ? 1 : 0 }} />
    </div>
  );
}

function ArtImage({
  src,
  alt,
  left,
  top,
  size,
  rot,
  onTap,
  pressed,
}: {
  src: string;
  alt: string;
  left: number;
  top: number;
  size: number;
  rot: number;
  onTap?: (e: React.MouseEvent<HTMLImageElement>) => void;
  pressed?: boolean;
}) {
  return (
    <Picture
      onClick={onTap}
      role={onTap ? "button" : undefined}
      aria-pressed={onTap ? !!pressed : undefined}
      tabIndex={onTap ? 0 : undefined}
      loading="lazy"
      decoding="async"
      src={src}
      alt={alt}
      className="v2-cutout"
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        objectFit: "contain",
        transform: `rotate(${rot}deg) scale(${pressed ? 1.12 : 1})`,
        transformOrigin: "center",
        transition: "transform 450ms cubic-bezier(0.2, 0.9, 0.3, 1.4)",
        cursor: onTap ? "pointer" : undefined,
        WebkitTapHighlightColor: "transparent",
      }}
    />
  );
}

export default function MobileAnatomy() {
  const { theme } = useTheme();
  const [scale, setScale] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const [reveal, setReveal] = useState(0);
  const [drain, setDrain] = useState(0);
  const [introDrawn, setIntroDrawn] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const artboardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tapped, setTapped] = useState<number | null>(null);
  const [tapBelow, setTapBelow] = useState(false);

  useEffect(() => {
    if (tapped === null) return;
    const t = window.setTimeout(() => setTapped(null), 4500);
    return () => window.clearTimeout(t);
  }, [tapped]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIntroDrawn(1));
    const t = window.setTimeout(() => setScrollEnabled(true), 4000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const onResize = () => setScale(window.innerWidth / ARTBOARD_W);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = rootRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const range = Math.max(1, rect.height - window.innerHeight);
        setReveal(Math.max(0, Math.min(1, Math.min(range, Math.max(0, -rect.top)) / range)));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // (No scroll motion-blur on phones: re-filtering the 5000px artboard every frame is
  // expensive and barely visible on a small screen.)

  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    let raf = 0;
    let blur = 0;
    const tick = () => {
      const now = performance.now();
      const dy = Math.abs(window.scrollY - lastY);
      const dt = Math.max(1, now - lastT);
      lastY = window.scrollY;
      lastT = now;
      blur = Math.max(Math.min(3, (dy / dt) * 0.5), blur * 0.85);
      const el = artboardRef.current;
      if (el) el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("img, p, h1, h2, h3, h4, span:not(svg span)"));
    els.forEach((el) => {
      if (!el.closest("svg")) el.classList.add("appear");
    });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("is-visible", e.isIntersecting)),
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => {
      if (el.classList.contains("appear")) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const totalWeight = SEGMENTS.reduce((s, x) => s + x.weight, 0);
  const revealed = (scrollEnabled ? Math.max(0, Math.min(1, reveal)) : 0) * totalWeight;
  // Each segment after the intro fills in turn: its start is the summed weight of the ones before it.
  const segProgress = SEGMENTS.map((seg, i) => {
    if (i === 0) return 0;
    const start = SEGMENTS.slice(1, i).reduce((s, x) => s + x.weight, 0);
    return Math.max(0, Math.min(1, (revealed - start) / seg.weight));
  });
  segProgress[0] = introDrawn;
  const restWeight = SEGMENTS.slice(1).reduce((s, x) => s + x.weight, 0);

  const streams: Stream[] = MOBILE_STRING_PATHS.map((d, i) => {
    const p = segProgress[i];
    let before = 0;
    let weight = SEGMENTS[i].weight;
    if (i === 0) weight = 1;
    else for (let j = 1; j < i; j++) before += SEGMENTS[j].weight;
    const drained = i === 0 ? drain : Math.max(0, Math.min(p, (drain * restWeight - before) / weight));
    const len = Math.max(0, p - drained);
    const start = SEGMENTS[i].reversed ? 1 - p : drained;
    return {
      d,
      normalized: true,
      start,
      end: start + len,
      duration: drain > 0 ? 0 : i === 0 ? 4000 : 200,
      easing: i === 0 ? "ease-in-out" : "linear",
      width: 5,
      joinStart: i > 0,
      joinEnd: i < MOBILE_STRING_PATHS.length - 1,
    };
  });

  return (
    <div
      ref={rootRef}
      style={{ width: "100vw", height: (ARTBOARD_H - TOP_CROP) * scale, position: "relative", overflow: "hidden" }}
    >
      <WaterStream
        svgRef={svgRef}
        viewBox={VIEWBOX}
        streams={streams}
        theme={theme}
        filterSourceRef={artboardRef}
        windowed
          style={{ zIndex: 0 }}
      />
      <div
        ref={artboardRef}
        style={{
          position: "absolute",
          left: 0,
          top: -TOP_CROP * scale,
          width: ARTBOARD_W,
          height: ARTBOARD_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          zIndex: 1,
        }}
      >
        <svg
          ref={svgRef}
          width={336}
          height={4723}
          viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
          fill="none"
          style={{ position: "absolute", left: 30, top: -2, width: 336, height: 4723, pointerEvents: "none" }}
        />

        <div style={{ position: "absolute", left: 220, top: 250, display: "flex", alignItems: "flex-end", gap: 12 }}>
          <svg width={46.494} height={35.407} viewBox="0 0 47 36">
            <path
              d="M2 30 C 12 22, 22 12, 40 6 L 32 2 L 40 6 L 36 14"
              stroke={V.tertiary}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={introDrawn > 0.9 ? 0 : 1}
              style={{ transition: "stroke-dashoffset 1400ms ease-out 400ms" }}
            />
          </svg>
          <p
            style={{
              ...type.caption,
              color: V.secondary,
              width: 96,
              opacity: introDrawn > 0.9 ? 1 : 0,
              transition: "opacity 500ms ease-out 1300ms",
            }}
          >
            {HERO.brainCaption}
          </p>
        </div>

        {HOBBIES.items.map((item, i) => {
          const slot = HOBBY_SLOTS[i];
          return slot ? (
            <ArtImage
              key={item.src}
              src={item.src}
              alt={item.alt}
              {...slot}
              pressed={tapped === i}
              onTap={(e) => {
                setTapBelow(e.currentTarget.getBoundingClientRect().top < 170);
                setTapped((cur) => (cur === i ? null : i));
              }}
            />
          ) : null;
        })}
        {tapped !== null && HOBBY_SLOTS[tapped] && (
          <TapBubble key={tapped} text={HOBBIES.items[tapped].message} slot={HOBBY_SLOTS[tapped]} below={tapBelow} />
        )}

        <div
          style={{
            position: "absolute",
            left: 40,
            top: 1348,
            width: 313,
            textAlign: "center",
            padding: "12px 16px",
            // No box: a soft halo in the page colour keeps the copy legible while the
            // stream and the toys stay visible behind it.
            textShadow: "0 0 10px var(--c-bg), 0 0 18px var(--c-bg), 0 0 28px var(--c-bg)",
            pointerEvents: "none",
          }}
        >
          <p style={{ ...type.bodyS, whiteSpace: "nowrap" }}>{HOBBIES.eyebrow}</p>
          <p style={{ ...type.displayL, marginTop: 8, whiteSpace: "nowrap" }}>{HOBBIES.headline}</p>
          <p style={{ ...type.bodyS, marginTop: 8 }}>{HOBBIES.footnote}</p>
          <p className="tap-hint">tap the toys ↑↓</p>
        </div>

        <p style={{ position: "absolute", left: 64, top: 1919, width: 166, ...type.displayL, textWrap: "balance" }}>
          {PASSIONS.heading}
        </p>

        {PASSIONS.items.map((p, i) => {
          const slot = PASSION_SLOTS[i];
          if (!slot) return null;
          return [
            <ArtImage key={`${p.title}-img`} src={p.src} alt={p.alt} {...slot.img} />,
            <p
              key={`${p.title}-t`}
              style={{ position: "absolute", ...slot.text, width: 214, ...type.titleM, textWrap: "balance" }}
            >
              {p.title}
            </p>,
            <p
              key={`${p.title}-b`}
              style={{
                position: "absolute",
                left: slot.text.left,
                top: slot.text.top + TITLE_GAP,
                width: 214,
                ...type.bodyL,
                textWrap: "balance",
              }}
            >
              {p.body}
            </p>,
          ];
        })}

        <p
          style={{
            position: "absolute",
            left: 122,
            top: 2917,
            width: 149,
            ...merge(type.displayL, { color: V.tertiary }),
            textAlign: "center",
          }}
        >
          <span style={{ color: V.primary }}>{TIMELINE.intro[0]}</span>
          {TIMELINE.intro[1]}
        </p>

        {TIMELINE.items.map((m, i) => {
          const slot = MILESTONE_SLOTS[i];
          if (!slot) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: slot.x,
                top: slot.y,
                width: slot.w,
                display: "flex",
                alignItems: "flex-start",
                gap: 18,
              }}
            >
              <div style={{ flex: "0 0 50px", height: 1, background: V.line, marginTop: 8 }} />
              <div style={{ flex: 1 }}>
                {m.lines.map((line, j) => (
                  <p key={j} style={merge(type.bodyS, { color: line.muted ? V.tertiary : V.secondary })}>
                    {line.text}
                  </p>
                ))}
                <p style={merge(type.bodyS, { color: V.tertiary })}>{m.year}</p>
              </div>
            </div>
          );
        })}

        <p
          style={{
            position: "absolute",
            left: 74,
            top: 4127,
            width: 245,
            ...merge(type.displayL, { color: V.tertiary }),
            textAlign: "center",
          }}
        >
          <span style={{ color: V.primary }}>{OWNERSHIP.lead}</span>
          {OWNERSHIP.rest}
        </p>
        <p style={{ position: "absolute", left: 76, top: 4245, width: 240, ...type.bodyS, textAlign: "center" }}>
          {OWNERSHIP.body}
        </p>

        <MobileVenn reveal={reveal} onDrainChange={setDrain} />

        <div style={{ position: "absolute", left: -19, top: 4872, width: 431, textAlign: "center" }}>
          <p style={type.displayL}>
            {VENN.outro.before}
            <span style={{ fontStyle: "italic", color: V.accent }}>{VENN.outro.italic}</span>
            {VENN.outro.after}
          </p>
          <p style={{ ...merge(type.bodyM, { color: V.tertiary }), marginTop: 8 }}>{VENN.sub}</p>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 24,
          top: "calc(90vh - 24px)",
          transform: "translateY(-100%)",
          width: "calc(100vw - 48px)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        {HERO.titleLines.map((line) => (
          <p
            key={line}
            style={{
              fontFamily: "'Inter', 'Inter Fallback', sans-serif",
              fontWeight: WEIGHT.semibold,
              fontSize: 32,
              letterSpacing: `${-1.28}px`,
              lineHeight: 1,
              color: V.primary,
              margin: 0,
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function MobileBadge({
  left,
  top,
  fill,
  deep,
  label,
  labelDx,
  labelDy,
  drawn,
  filled,
  drawDuration = 1200,
}: {
  left: number;
  top: number;
  fill: string;
  deep: string;
  label: string;
  labelDx: number;
  labelDy: number;
  drawn: boolean;
  filled: boolean;
  drawDuration?: number;
}) {
  return (
    <div style={{ position: "absolute", left, top, width: 179, height: 179 }}>
      <WaterBadge
        size={179}
        fill={fill}
        deep={deep}
        drawn={drawn}
        filled={filled}
        drawDuration={drawDuration}
        label={label}
        labelStyle={{ ...type.bodyM, color: V.primary, left: 179 / 2 + labelDx, top: 179 / 2 - 8 + labelDy }}
      />
    </div>
  );
}

function MobileVenn({ reveal, onDrainChange }: { reveal: number; onDrainChange: (v: number) => void }) {
  const left = ARTBOARD_W / 2 - 89.5;
  const top = 4719.5 - 177.6;
  const [stage, setStage] = useState(0);
  const done = reveal >= 0.995;

  // Scrolling back up resets the Venn (adjusted during render, not in an effect).
  const [wasDone, setWasDone] = useState(done);
  if (done !== wasDone) {
    setWasDone(done);
    if (!done) setStage(0);
  }

  useEffect(() => {
    const timers: number[] = [];
    let raf = 0;
    if (done) {
      timers.push(window.setTimeout(() => setStage(1), 400));
      timers.push(
        window.setTimeout(() => {
          const start = performance.now();
          const frame = () => {
            const t = (performance.now() - start) / 1000;
            const c = Math.min(1, Math.max(0, t));
            onDrainChange(1 - Math.pow(1 - c, 3));
            if (t < 1) raf = requestAnimationFrame(frame);
          };
          raf = requestAnimationFrame(frame);
        }, 450),
      );
      timers.push(window.setTimeout(() => setStage(2), 2000));
      timers.push(window.setTimeout(() => setStage(3), 2200));
      timers.push(window.setTimeout(() => setStage(4), 3400));
    } else {
      onDrainChange(0);
    }
    return () => {
      timers.forEach(clearTimeout);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [done, onDrainChange]);

  const cloned = stage >= 2;
  const spread = stage >= 3;
  const filled = stage >= 4;

  const clone = (fill: string, deep: string, label: string, dx: number, dy: number, labelDx: number) => (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: 179,
        height: 179,
        transform: spread ? `translate(${dx}px, ${dy}px)` : "translate(0,0)",
        transition: "transform 1100ms cubic-bezier(0.42, 0, 0.58, 1)",
      }}
    >
      <MobileBadge
        left={0}
        top={0}
        fill={fill}
        deep={deep}
        label={label}
        labelDx={labelDx}
        labelDy={22}
        drawn
        filled={filled}
        drawDuration={0}
      />
    </div>
  );

  return (
    <>
      {cloned && clone(VENN.colors.left, VENN.deep.left, VENN.labels.left, -61.925, 95, -22)}
      {cloned && clone(VENN.colors.right, VENN.deep.right, VENN.labels.right, 61.925, 95, 22)}
      <MobileBadge
        left={left}
        top={top}
        fill={VENN.colors.top}
        deep={VENN.deep.top}
        label={VENN.labels.top}
        labelDx={0}
        labelDy={-28}
        drawn={stage >= 1}
        filled={filled}
        drawDuration={1500}
      />
    </>
  );
}
