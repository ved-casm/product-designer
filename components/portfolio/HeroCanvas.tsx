"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import Picture from "../Picture";
import { createPortal } from "react-dom";
import { fromCenter as F } from "../assets";
import { reverseCubicPath, stripMove } from "../pathUtils";
import { BOOK_HEAD, BOOK_TAIL, BRAIN_PATH, SCRIBBLE_PATH } from "../paths";
import { merge, WEIGHT } from "../typography";
import { HERO, HOBBIES, OWNERSHIP, PASSIONS, TIMELINE, VENN } from "./content";
import { type, useTheme, V } from "./theme";
import WaterBadge from "./WaterBadge";
import WaterStream from "./LazyWaterStream";
import type { Stream } from "./water-shared";

const BRIDGE_LEN = Math.hypot(2961.53 - 2870.5, 369.215 - 398.403);
const BOOK_PATH = `${BOOK_HEAD}${stripMove(reverseCubicPath(BOOK_TAIL))}`;
const VIEWBOX = { w: 6520, h: 565 };

const milestoneText = type.bodyM;
const milestoneYear = merge(type.bodyS, { color: V.tertiary });

/** Placement of each milestone along the timeline (same rhythm as v1). */
const MILESTONE_SLOTS = [
  { x: 4280, textTop: 84.5, width: 169, curveY: -17, at: 4420 },
  { x: 4399, textTop: -138, width: 253, curveY: 3, at: 4539 },
  { x: 4624, textTop: 128.5, width: 280, curveY: 15, at: 4764 },
  { x: 4803, textTop: -161, width: 282, curveY: 3, at: 5043 },
  { x: 5023, textTop: 82.5, width: 214, curveY: -32, at: 5163 },
  { x: 5179, textTop: -294, width: 282, curveY: -78, at: 5319 },
  { x: 5338, textTop: 109.5, width: 320, curveY: -109, at: 5478 },
];

/** Hobby cutouts around the "i'm probably playing" headline. */
const HOBBY_SLOTS = [
  { x: 1700, y: -192.95, size: 128, rot: -12.6 },
  { x: 1794, y: 176.5, size: 150, rot: 0 },
  { x: 2040, y: 291, size: 128, rot: 6 },
  { x: 2110, y: 139.61, size: 168, rot: 9.79 },
  { x: 2335, y: 118.2, size: 120, rot: -7.4 },
  { x: 2357, y: -240.5, size: 124, rot: 4 },
];

const PASSION_SLOTS = [
  { img: { x: 2810, y: 159, size: 220, rot: 11.31 }, text: { x: 3023.56, y: 124 } },
  { img: { x: 3120, y: -189, size: 230, rot: -6.94 }, text: { x: 3394.56, y: -232 } },
  { img: { x: 3525, y: 119, size: 210, rot: -2.45 }, text: { x: 3744.56, y: 104 } },
];

type Props = {
  progress: number;
  heroLoaded: boolean;
  vennTriggerProgress: number;
  waterHost: HTMLElement | null;
  filterSourceRef: RefObject<HTMLElement | null>;
};

export default function HeroCanvas({ progress, heroLoaded, vennTriggerProgress, waterHost, filterSourceRef }: Props) {
  const { theme } = useTheme();
  const brainD = useMemo(() => reverseCubicPath(BRAIN_PATH), []);
  const fullD = useMemo(() => `${brainD} L2961.53 369.215${stripMove(BOOK_PATH)}`, [brainD]);
  const TRACK = 6509.5;
  const scrollX = progress * TRACK;
  const svgRef = useRef<SVGSVGElement>(null);
  const brainRef = useRef<SVGPathElement>(null);
  const bookRef = useRef<SVGPathElement>(null);
  const [lengths, setLengths] = useState<{ brain: number; book: number } | null>(null);

  useLayoutEffect(() => {
    if (!brainRef.current || !bookRef.current) return;
    setLengths({ brain: brainRef.current.getTotalLength(), book: bookRef.current.getTotalLength() });
  }, []);

  const lengthAt = (x: number) => {
    if (!lengths) return 0;
    const { brain, book } = lengths;
    if (x <= 1527) return 0;
    if (x <= 2870.5) return ((x - 1527) / (2870.5 - 1527)) * brain;
    if (x <= 2961.53) return brain + ((x - 2870.5) / (2961.53 - 2870.5)) * BRIDGE_LEN;
    if (x <= 6512.5) return brain + BRIDGE_LEN + ((x - 2961.53) / (6512.5 - 2961.53)) * book;
    return brain + BRIDGE_LEN + book;
  };

  const SCRIBBLE_MS = 4000;
  const vennReached = progress >= vennTriggerProgress;
  const section = scrollX < 1500 ? "hero" : scrollX < 2650 ? "hobbies" : scrollX < 5900 ? "middle" : "venn";

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("hero-section", { detail: { section } }));
  }, [section]);

  const [drain, setDrain] = useState(0);
  const [outroVisible, setOutroVisible] = useState(false);
  const [scribbleDone, setScribbleDone] = useState(false);

  // Leaving a trigger resets its animation; adjusted during render rather than in an effect.
  const [prevTriggers, setPrevTriggers] = useState({ heroLoaded, vennReached });
  if (prevTriggers.heroLoaded !== heroLoaded || prevTriggers.vennReached !== vennReached) {
    setPrevTriggers({ heroLoaded, vennReached });
    if (!heroLoaded) setScribbleDone(false);
    if (!vennReached) {
      setDrain(0);
      setOutroVisible(false);
    }
  }

  useEffect(() => {
    if (!heroLoaded) return;
    const t = window.setTimeout(() => setScribbleDone(true), SCRIBBLE_MS + 200);
    return () => clearTimeout(t);
  }, [heroLoaded]);

  useEffect(() => {
    if (!vennReached) return;
    const t1 = window.setTimeout(() => setDrain(1), 1400);
    const t2 = window.setTimeout(() => setOutroVisible(true), 4100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [vennReached]);

  useEffect(() => {
    if (!outroVisible) return;
    const t = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("cursor-comment:show", { detail: { id: "venn", section: "venn", text: VENN.comment } }),
      );
    }, 400);
    return () => {
      clearTimeout(t);
      window.dispatchEvent(new CustomEvent("cursor-comment:hide", { detail: { id: "venn" } }));
    };
  }, [outroVisible]);

  const [brainUnlocked, setBrainUnlocked] = useState(false);
  useEffect(() => {
    if (!lengths || brainUnlocked || scrollX < 2870.5) return;
    const t = window.setTimeout(() => setBrainUnlocked(true), 250);
    return () => clearTimeout(t);
  }, [scrollX, brainUnlocked, lengths]);

  const total = lengths ? lengths.brain + BRIDGE_LEN + lengths.book : 0;
  let head = lengthAt(scrollX);
  if (scribbleDone && lengths) head = Math.max(head, 0.03 * lengths.brain);
  if (!scribbleDone) head = 0;
  if (lengths && !brainUnlocked) head = Math.min(head, lengths.brain);
  if (vennReached) head = total;

  const drainX = drain * (TRACK + 100);
  let tail = drainX <= 1527 ? 0 : lengthAt(drainX);
  if (tail > head) tail = head;

  const scribbleStart = Math.min(1, drain);
  const scribbleEnd = Math.max(scribbleStart, heroLoaded ? 1 : 0);

  const streams: Stream[] = [
    {
      d: SCRIBBLE_PATH,
      normalized: true,
      start: scribbleStart,
      end: scribbleEnd,
      duration: drain > 0 ? 1600 : 4000,
      easing: "ease-in-out",
      width: 4.5,
      joinEnd: true,
    },
    {
      d: fullD,
      start: tail,
      end: Math.max(tail, head),
      duration: drain > 0 ? 1000 : 1200,
      easing: drain > 0 ? "ease-in-out" : "ease-out",
      width: 7,
      joinStart: true,
    },
  ];

  return (
    <div className="absolute inset-0">
      <svg
        ref={svgRef}
        className="absolute pointer-events-none"
        style={{ left: 0, top: "calc(50% + 20px)", transform: "translateY(-50%)", width: 6520, height: 565 }}
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path ref={brainRef} d={brainD} stroke="none" fill="none" />
        <path ref={bookRef} d={BOOK_PATH} stroke="none" fill="none" />
      </svg>
      {waterHost &&
        createPortal(
          <WaterStream
            svgRef={svgRef}
            viewBox={VIEWBOX}
            streams={streams}
            theme={theme}
            filterSourceRef={filterSourceRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />,
          waterHost,
        )}

      <div
        className="absolute"
        style={{
          left: 32,
          bottom: 19,
          width: 420,
          fontFamily: "'Inter', 'Inter Fallback', sans-serif",
          fontWeight: WEIGHT.semibold,
          fontSize: 40,
          letterSpacing: `${-0.04 * 40}px`,
          color: V.primary,
          lineHeight: 1,
        }}
      >
        {HERO.titleLines.map((line, i) => (
          <p key={line} style={{ margin: 0 }}>
            {i === HERO.titleLines.length - 1 ? <span>{line}</span> : line}
          </p>
        ))}
      </div>

      <div className="absolute flex items-end gap-[12px]" style={{ left: 939, top: F(-233) }}>
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
            strokeDashoffset={scribbleDone ? 0 : 1}
            style={{ transition: "stroke-dashoffset 1400ms ease-out 400ms" }}
          />
        </svg>
        <p
          style={{
            ...type.bodyM,
            width: 112,
            opacity: scribbleDone ? 1 : 0,
            transition: "opacity 500ms ease-out 1300ms",
          }}
        >
          {HERO.brainCaption}
        </p>
      </div>

      <div className="absolute flex flex-col items-center gap-[8px] text-center" style={{ left: 1946, top: F(-118) }}>
        <p style={type.bodyL}>{HOBBIES.eyebrow}</p>
        <p style={{ ...type.displayXL, color: V.secondary, whiteSpace: "nowrap" }}>{HOBBIES.headline}</p>
        <p style={type.bodyL}>{HOBBIES.footnote}</p>
      </div>

      {HOBBIES.items.map((item, i) => {
        const slot = HOBBY_SLOTS[i];
        if (!slot) return null;
        return <Cutout key={item.src} {...item} x={slot.x} y={F(slot.y)} size={slot.size} rot={slot.rot} />;
      })}

      <p className="absolute" style={{ ...type.displayXL, left: 2771, top: F(-212), width: 236, color: V.secondary }}>
        {PASSIONS.heading}
      </p>
      {PASSIONS.items.map((p, i) => {
        const slot = PASSION_SLOTS[i];
        if (!slot) return null;
        return (
          <Fragment key={p.title}>
            <Cutout src={p.src} alt={p.alt} x={slot.img.x} y={F(slot.img.y)} size={slot.img.size} rot={slot.img.rot} />
            <TextBlock x={slot.text.x} y={F(slot.text.y)} title={p.title} body={p.body} />
          </Fragment>
        );
      })}

      {TIMELINE.items.map((m, i) => {
        const slot = MILESTONE_SLOTS[i];
        if (!slot) return null;
        return (
          <Milestone
            key={i}
            x={slot.x}
            textTop={slot.textTop}
            width={slot.width}
            curveY={slot.curveY}
            visible={scrollX >= slot.at}
          >
            {m.lines.map((line, j) => (
              <p key={j} style={line.muted ? { ...milestoneText, color: V.tertiary } : milestoneText}>
                {line.text}
              </p>
            ))}
            <p style={milestoneYear}>{m.year}</p>
          </Milestone>
        );
      })}

      <p
        className="absolute text-center"
        style={{
          ...type.displayL,
          left: 4446.5,
          top: F(278),
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          color: V.tertiary,
          filter: scrollX >= 4446.5 - 600 ? "blur(0px)" : "blur(12px)",
          opacity: scrollX >= 4446.5 - 600 ? 1 : 0,
          transition: "filter 900ms ease-out, opacity 900ms ease-out",
        }}
      >
        <span style={{ color: V.primary }}>{TIMELINE.intro[0]}</span>
        <span>{TIMELINE.intro[1]}</span>
      </p>
      <p
        className="absolute text-center"
        style={{
          ...type.displayL,
          left: 4965.5,
          top: F(278),
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          color: V.tertiary,
        }}
      >
        <span style={{ color: V.primary }}>{OWNERSHIP.lead}</span>
        <span>{OWNERSHIP.rest}</span>
      </p>
      <p className="absolute" style={{ ...type.bodyM, left: 5318, top: F(278), width: 360, textWrap: "balance" }}>
        {OWNERSHIP.body}
      </p>

      <Venn progress={progress} vennTriggerProgress={vennTriggerProgress} />

      <p
        className="absolute text-center"
        style={{
          left: 6510.5,
          top: F(227),
          transform: `translateX(-50%) translateY(${outroVisible ? 0 : 8}px)`,
          width: 431,
          color: V.primary,
          margin: 0,
          lineHeight: 1,
          opacity: outroVisible ? 1 : 0,
          transition: "opacity 800ms ease-out, transform 800ms ease-out",
        }}
      >
        <span style={type.displayL}>{VENN.outro.before}</span>
        <span style={{ ...type.displayL, fontStyle: "italic", color: V.accent }}>{VENN.outro.italic}</span>
        <span style={type.displayL}>{VENN.outro.after}</span>
      </p>
      <p
        className="absolute text-center"
        style={{
          ...type.bodyL,
          left: 6510.5,
          top: F(267),
          transform: `translateX(-50%) translateY(${outroVisible ? 0 : 8}px)`,
          width: 381,
          fontWeight: WEIGHT.medium,
          color: V.tertiary,
          opacity: outroVisible ? 1 : 0,
          transition: "opacity 800ms ease-out 150ms, transform 800ms ease-out 150ms",
        }}
      >
        {VENN.sub}
      </p>
    </div>
  );
}

function Milestone({
  x,
  textTop,
  width,
  curveY = 0,
  children,
  visible = true,
}: {
  x: number;
  textTop: number;
  width: number;
  curveY?: number;
  children: ReactNode;
  visible?: boolean;
}) {
  const above = textTop < 0;
  const stemTop = above ? curveY - 90 : curveY;
  const dotTop = above ? curveY - 90 : curveY + 90;
  const textY = above ? dotTop - 24 : dotTop + 24;
  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: "calc(50% + 20px)",
        width,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 900ms ease-out, transform 900ms ease-out",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: stemTop,
          width: 2,
          height: 90,
          background: V.line,
          transform: "translateX(-50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: dotTop,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: V.accent,
          boxShadow: `0 0 10px ${V.accent}`,
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        className="text-center"
        style={{
          position: "absolute",
          left: 0,
          top: textY,
          width: "100%",
          transform: above ? "translateY(-100%)" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const hoverHandlers = (message?: string) =>
  message
    ? {
        onMouseEnter: () =>
          window.dispatchEvent(
            new CustomEvent("cursor-comment:show", { detail: { id: message, section: "hobbies", text: message } }),
          ),
        onMouseLeave: () =>
          window.dispatchEvent(new CustomEvent("cursor-comment:hide", { detail: { id: message } })),
      }
    : {};

function Cutout({
  src,
  alt,
  x,
  y,
  size,
  rot,
  message,
}: {
  src: string;
  alt: string;
  x: number;
  y: string;
  size: number;
  rot: number;
  message?: string;
}) {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{ left: x, top: y, transform: `translateY(-${size / 2}px)`, width: size, height: size }}
      {...hoverHandlers(message)}
    >
      <div style={{ transform: `rotate(${rot}deg)`, width: size * 0.9, height: size * 0.9 }}>
        <Picture
          src={src}
          alt={alt}
          loading="lazy"
          className="v2-cutout w-full h-full object-contain transition-transform duration-300 ease-out hover:scale-110"
        />
      </div>
    </div>
  );
}

function TextBlock({ x, y, title, body }: { x: number; y: string; title: string; body: string }) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: 260 }}>
      <p style={type.titleM}>{title}</p>
      <p style={{ ...type.bodyL, marginTop: 4 }}>{body}</p>
    </div>
  );
}

function VennBadge({
  x,
  top,
  fill,
  label,
  labelLeft,
  labelTop,
  drawn,
  filled,
  drawDuration = 1200,
  deep,
}: {
  x: number;
  top: number;
  fill: string;
  deep: string;
  label: string;
  labelLeft: number;
  labelTop: number;
  drawn: boolean;
  filled: boolean;
  drawDuration?: number;
}) {
  return (
    <div className="absolute" style={{ left: x, top, width: 267, height: 267 }}>
      <WaterBadge
        size={267}
        fill={fill}
        deep={deep}
        drawn={drawn}
        filled={filled}
        drawDuration={drawDuration}
        label={label}
        labelStyle={{ ...type.titleM, left: labelLeft, top: labelTop }}
      />
    </div>
  );
}

function Venn({ progress, vennTriggerProgress }: { progress: number; vennTriggerProgress: number }) {
  const [stage, setStage] = useState(0);
  const active = progress >= vennTriggerProgress;

  // Scrolling back out of the Venn resets it (adjusted during render, not in an effect).
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) setStage(0);
  }

  useEffect(() => {
    if (!active) return;
    const timers = [
      window.setTimeout(() => setStage(1), 700),
      window.setTimeout(() => setStage(2), 2300),
      window.setTimeout(() => setStage(3), 2500),
      window.setTimeout(() => setStage(4), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const drawn = stage >= 1;
  const cloned = stage >= 2;
  const spread = stage >= 3;
  const filled = stage >= 4;
  const move = "transform 1100ms cubic-bezier(0.42, 0, 0.58, 1)";

  return (
    <div className="absolute" style={{ left: 6308, top: "calc(50% - 225px)", width: 402, height: 426 }}>
      <div className="absolute inset-0">
        {cloned && (
          <div
            className="absolute"
            style={{ left: 68, top: 0, transform: spread ? "translate(-68px, 134px)" : "translate(0,0)", transition: move }}
          >
            <VennBadge
              x={0}
              top={0}
              fill={VENN.colors.left}
              deep={VENN.deep.left}
              label={VENN.labels.left}
              labelLeft={64.5}
              labelTop={159}
              drawn
              filled={filled}
              drawDuration={0}
            />
          </div>
        )}
        {cloned && (
          <div
            className="absolute"
            style={{ left: 68, top: 0, transform: spread ? "translate(67px, 134px)" : "translate(0,0)", transition: move }}
          >
            <VennBadge
              x={0}
              top={0}
              fill={VENN.colors.right}
              deep={VENN.deep.right}
              label={VENN.labels.right}
              labelLeft={187.5}
              labelTop={158}
              drawn
              filled={filled}
              drawDuration={0}
            />
          </div>
        )}
        <VennBadge
          x={68}
          top={0}
          fill={VENN.colors.top}
              deep={VENN.deep.top}
          label={VENN.labels.top}
          labelLeft={134.5}
          labelTop={56}
          drawn={drawn}
          filled={filled}
          drawDuration={1500}
        />
      </div>
    </div>
  );
}
