"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { type } from "./typography";

type Comment = {
  id: string;
  text: string;
  autoFade: boolean;
  section?: string;
  bg?: string;
  border?: string;
  shadow?: string;
};

type ShowDetail = Partial<Omit<Comment, "autoFade">> & { text?: string };

type Props = {
  delay?: number;
  introText?: string;
  charInterval?: number;
};

let measureCtx: CanvasRenderingContext2D | null = null;
/** Width of the fully typed bubble, so it can flip before it grows past the edge. */
function bubbleWidth(text: string) {
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
    if (measureCtx) measureCtx.font = "500 14px Inter, 'Inter Fallback', sans-serif";
  }
  const textW = measureCtx ? measureCtx.measureText(text).width : text.length * 7.4;
  return textW + 32 + 4 + 6;
}

/** Keep the bubble on screen: open to the left / above the cursor near the edges. */
function layout(x: number, y: number, text: string, visible: boolean) {
  const width = bubbleWidth(text);
  const flipX = x + 18 + width > window.innerWidth - 12;
  const flipY = y + 22 + 48 > window.innerHeight - 12;
  const tx = flipX ? "calc(-100% - 14px)" : "18px";
  const ty = flipY ? "calc(-100% - 14px)" : "22px";
  const radius = flipX
    ? flipY
      ? "24px 24px 2px 24px"
      : "24px 2px 24px 24px"
    : flipY
      ? "24px 24px 24px 2px"
      : "2px 24px 24px 24px";
  return {
    x,
    y,
    transform: `translate(${tx}, ${ty}) scale(${visible ? 1 : 0.9})`,
    origin: `${flipY ? "bottom" : "top"} ${flipX ? "right" : "left"}`,
    radius,
  };
}

/**
 * Speech bubble that trails the cursor and types messages out character by character.
 * Driven by `cursor-comment:show` / `cursor-comment:hide` window events.
 */
export default function CursorComment({
  delay = 5200,
  introText = "Hey there, Ved here.",
  charInterval = 32,
}: Props) {
  // Position lives in a ref and is written straight to the DOM every frame, so the
  // bubble follows the mouse without re-rendering React 60 times a second.
  const [hasPos, setHasPos] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const placement = useRef({ text: "", visible: false });
  const [comment, setComment] = useState<Comment | null>(null);
  // How many characters of which comment have been typed; a new comment starts from zero on its own.
  const [progress, setProgress] = useState<{ of: Comment | null; n: number }>({ of: null, n: 0 });
  const [hidden, setHidden] = useState(false);
  const rafRef = useRef<number | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (!hasMoved.current) {
        current.current = { x: e.clientX, y: e.clientY };
        hasMoved.current = true;
        setHasPos(true);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Writes the bubble's position and shape straight to the DOM (never through React state).
  const place = useCallback(() => {
    if (!wrapRef.current || !bubbleRef.current) return;
    const p = layout(current.current.x, current.current.y, placement.current.text, placement.current.visible);
    const w = wrapRef.current.style;
    w.left = `${p.x}px`;
    w.top = `${p.y}px`;
    w.transform = p.transform;
    w.transformOrigin = p.origin;
    bubbleRef.current.style.borderRadius = p.radius;
  }, []);

  useEffect(() => {
    const tick = () => {
      if (hasMoved.current) {
        const dx = target.current.x - current.current.x;
        const dy = target.current.y - current.current.y;
        current.current.x += dx * 0.28;
        current.current.y += dy * 0.28;
        place();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [place]);

  const heroSection = useRef("hero");
  const worksRevealed = useRef(false);
  const activeSection = useRef("hero");

  useEffect(() => {
    const sync = () => {
      const next = worksRevealed.current ? "works" : heroSection.current;
      if (next !== activeSection.current) {
        activeSection.current = next;
        setComment((c) => {
          if (c && c.section && c.section !== next) setHidden(true);
          return c;
        });
      }
    };
    const onRevealed = () => {
      worksRevealed.current = true;
      sync();
    };
    const onHidden = () => {
      worksRevealed.current = false;
      sync();
    };
    const onHeroSection = (e: Event) => {
      const detail = (e as CustomEvent<{ section?: string }>).detail;
      if (detail?.section) {
        heroSection.current = detail.section;
        sync();
      }
    };
    window.addEventListener("works-revealed", onRevealed);
    window.addEventListener("works-hidden", onHidden);
    window.addEventListener("hero-section", onHeroSection);
    return () => {
      window.removeEventListener("works-revealed", onRevealed);
      window.removeEventListener("works-hidden", onHidden);
      window.removeEventListener("hero-section", onHeroSection);
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (activeSection.current === "hero") {
        setComment({ id: "intro", text: introText, autoFade: true, section: "hero" });
        setHidden(false);
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [delay, introText]);

  useEffect(() => {
    const onShow = (e: Event) => {
      const d = (e as CustomEvent<ShowDetail>).detail;
      if (d?.text) {
        setComment({
          id: d.id ?? d.text,
          text: d.text,
          autoFade: true,
          section: d.section,
          bg: d.bg,
          border: d.border,
          shadow: d.shadow,
        });
        setHidden(false);
      }
    };
    const onHide = (e: Event) => {
      const d = (e as CustomEvent<{ id?: string }>).detail;
      setComment((c) => {
        if (c && !(d?.id && c.id !== d.id)) setHidden(true);
        return c;
      });
    };
    window.addEventListener("cursor-comment:show", onShow);
    window.addEventListener("cursor-comment:hide", onHide);
    return () => {
      window.removeEventListener("cursor-comment:show", onShow);
      window.removeEventListener("cursor-comment:hide", onHide);
    };
  }, []);

  useEffect(() => {
    if (!comment) return;
    let count = 0;
    let cancelled = false;
    let fadeTimer: number | undefined;
    const step = () => {
      if (cancelled) return;
      count += 1;
      setProgress({ of: comment, n: count });
      if (count >= comment.text.length) {
        if (comment.autoFade) fadeTimer = window.setTimeout(() => setHidden(true), 5000);
        return;
      }
      const ch = comment.text[count - 1];
      let wait = charInterval + Math.random() * 35;
      if (ch === ",") wait += 120;
      if (ch === "." || ch === "!" || ch === "?") wait += 180;
      if (ch === " ") wait += 25;
      window.setTimeout(step, wait);
    };
    const start = window.setTimeout(step, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [comment, charInterval]);

  const visible = !hidden;

  // Size and side of the bubble depend on the text; position it before the browser paints.
  useLayoutEffect(() => {
    placement.current = { text: comment?.text ?? "", visible };
    place();
  }, [comment, visible, hasPos, place]);

  if (!hasPos || !comment) return null;

  const typed = progress.of === comment ? comment.text.slice(0, progress.n) : "";

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{
        // left / top / transform are written by place(); React leaves them alone.
        position: "fixed",
        width: "max-content",
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease-out, transform 500ms cubic-bezier(0.2, 0.9, 0.3, 1.2)",
        pointerEvents: "none",
        zIndex: 9999,
        willChange: "transform, opacity",
      }}
    >
      <div
        ref={bubbleRef}
        style={{
          position: "relative",
          background: comment.bg ?? "#2E90FA",
          border: `2px solid ${comment.border ?? "#1570EF"}`,
          ...type.cursorBubble,
          padding: "8px 16px",
          whiteSpace: "nowrap",
          filter: `drop-shadow(4px 4px 5px ${comment.shadow ?? "rgba(46,144,250,0.16)"})`,
        }}
      >
        {typed}
        <span
          style={{
            display: "inline-block",
            width: 1,
            marginLeft: 2,
            opacity: typed.length < comment.text.length ? 1 : 0,
            transition: "opacity 300ms ease-out",
            animation: "cursor-comment-blink 1s steps(2, start) infinite",
          }}
        >
          {" "}
        </span>
      </div>
      <style>{`
        @keyframes cursor-comment-blink {
          0%, 50% { background: rgba(255,255,255,0.9); }
          50.01%, 100% { background: transparent; }
        }
      `}</style>
    </div>
  );
}
