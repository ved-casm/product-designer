"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { REVEAL_OFFSET as N } from "../assets";
import CursorComment from "../CursorComment";
import RevealLayer from "../RevealLayer";
import { useIsMobile } from "../useIsMobile";
import { HERO, PROFILE } from "./content";
import HeroCanvas from "./HeroCanvas";
import MobileAnatomy from "./MobileAnatomy";
import Nav from "./Nav";
import { ThemeProvider, type, V } from "./theme";
import { WATER_SYNC_EVENT } from "./water-shared";

const Works = dynamic(() => import("./Works"), { ssr: false });
const Process = dynamic(() => import("./Process"), { ssr: false });
const Clients = dynamic(() => import("./Clients"), { ssr: false });
const Contact = dynamic(() => import("./Contact"), { ssr: false });

/** Everything that follows the works section, in page order. */
function AfterWorks() {
  return (
    <div style={{ position: "relative", zIndex: 2 }}>
      <Process />
      <Clients />
      <Contact />
    </div>
  );
}

const DEFAULT_CANVAS_W = 7268;
const VENN_X = 6509;
const MIN_CANVAS_W = 6710;
const CANVAS_TRIM = 140;
const canvasWidthFor = (viewportW: number) =>
  Math.max(MIN_CANVAS_W, Math.round(VENN_X + viewportW / 2) - CANVAS_TRIM);
const VENN_LOCK_MS = 4200;

export default function HomeV2() {
  return (
    <ThemeProvider>
      <Home />
    </ThemeProvider>
  );
}

function Home() {
  const scrollerRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();
  const [progress, setProgress] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [worksReady, setWorksReady] = useState(false);
  const [waterHost, setWaterHost] = useState<HTMLDivElement | null>(null);

  // Every load starts at the very beginning so the stream draws in again.
  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo(0, 0);
    if (scrollerRef.current) scrollerRef.current.scrollLeft = 0;
  }, [isMobile]);

  useEffect(() => {
    const ready = () => setWorksReady(true);
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(ready, { timeout: 2000 });
    else setTimeout(ready, 800);
  }, []);

  const [canvasW, setCanvasW] = useState(() =>
    typeof window !== "undefined" ? canvasWidthFor(window.innerWidth) : DEFAULT_CANVAS_W,
  );
  const unlockedRef = useRef(true);
  const canvasWRef = useRef(canvasW);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const replay = () => {
      setHeroLoaded(false);
      window.setTimeout(() => setHeroLoaded(true), 60);
    };
    window.addEventListener("replay-hero", replay);
    return () => window.removeEventListener("replay-hero", replay);
  }, [isMobile]);

  const vennTriggerProgress = MIN_CANVAS_W / canvasW;

  // Deep links from case studies (/#work, /#process, /#contact) jump past the hero.
  useEffect(() => {
    if (!worksReady) return;
    const target = { "#work": "works-section", "#process": "process-section", "#contact": "contact-section" }[
      window.location.hash
    ];
    if (!target) return;
    const t = window.setTimeout(() => {
      window.dispatchEvent(new Event("force-unlock"));
      window.dispatchEvent(new Event("nav-go-works"));
      window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ block: "start" });
        // Drop the hash so a later reload starts from the top again.
        history.replaceState(null, "", window.location.pathname);
      }, 120);
    }, 400);
    return () => window.clearTimeout(t);
  }, [worksReady]);

  useEffect(() => {
    canvasWRef.current = canvasW;
  }, [canvasW]);

  useEffect(() => {
    const onResize = () => {
      const w = scrollerRef.current?.clientWidth || window.innerWidth;
      setCanvasW(canvasWidthFor(w));
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);

  // Lock page scroll while the venn animation plays.
  useEffect(() => {
    if (isMobile || unlocked) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.scrollTo(0, 0);
    const onScroll = () => {
      if (!unlockedRef.current && window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.target as Node | null;
      if (!(t && scrollerRef.current && scrollerRef.current.contains(t))) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(e.key)) e.preventDefault();
    };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [unlocked, isMobile]);

  const vennLocked = useRef(false);
  useEffect(() => {
    if (isMobile || vennLocked.current || progress < vennTriggerProgress) return;
    vennLocked.current = true;
    setUnlocked(false);
    const t = window.setTimeout(() => setUnlocked(true), VENN_LOCK_MS);
    return () => clearTimeout(t);
  }, [progress, isMobile, vennTriggerProgress]);

  useEffect(() => {
    const onForceUnlock = () => {
      unlockedRef.current = true;
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      setUnlocked(true);
    };
    window.addEventListener("force-unlock", onForceUnlock);
    return () => window.removeEventListener("force-unlock", onForceUnlock);
  }, []);

  // Vertical wheel -> smooth horizontal scroll, with velocity-based motion blur.
  useEffect(() => {
    if (isMobile) return;
    const scroller = scrollerRef.current;
    const canvas = canvasRef.current;
    if (!scroller || !canvas) return;
    const target = { val: scroller.scrollLeft };
    let smoothRaf: number | null = null;
    let lastLeft = scroller.scrollLeft;
    let lastT = performance.now();
    let decayRaf: number | null = null;
    let viewW = scroller.clientWidth;
    let maxLeft = scroller.scrollWidth - viewW;
    const measure = () => {
      viewW = scroller.clientWidth;
      maxLeft = scroller.scrollWidth - viewW;
    };
    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    ro.observe(canvas);

    const setBlur = (v: number) => {
      canvas.style.filter = v > 0.05 ? `blur(${v.toFixed(2)}px)` : "";
    };
    const decay = () => {
      const next = (parseFloat(canvas.style.filter.replace(/[^\d.]/g, "")) || 0) * 0.82;
      if (next < 0.1) {
        setBlur(0);
        decayRaf = null;
      } else {
        setBlur(next);
        decayRaf = requestAnimationFrame(decay);
      }
    };
    const sampleVelocity = () => {
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const v = Math.abs(scroller.scrollLeft - lastLeft) / dt;
      lastLeft = scroller.scrollLeft;
      lastT = now;
      setBlur(Math.min(3, v * 0.5));
      if (decayRaf != null) {
        cancelAnimationFrame(decayRaf);
        decayRaf = null;
      }
    };
    const smooth = () => {
      // Keep the target reachable: if the layout shrank, a target past the end would keep this loop
      // running forever, pulling the hero back toward the end whatever else scrolls it.
      target.val = Math.min(target.val, scroller.scrollWidth - scroller.clientWidth);
      const cur = scroller.scrollLeft;
      const diff = target.val - cur;
      if (Math.abs(diff) > 0.5) {
        scroller.scrollLeft = cur + diff * 0.18;
        sampleVelocity();
        window.dispatchEvent(new Event(WATER_SYNC_EVENT));
        smoothRaf = requestAnimationFrame(smooth);
      } else {
        scroller.scrollLeft = target.val;
        sampleVelocity();
        window.dispatchEvent(new Event(WATER_SYNC_EVENT));
        smoothRaf = null;
        if (decayRaf == null) decayRaf = requestAnimationFrame(decay);
      }
    };
    const onWheel = (e: WheelEvent & { __horizontalHandled?: boolean }) => {
      if (e.__horizontalHandled || window.scrollY > 0) return;
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta === 0) return;
      e.__horizontalHandled = true;
      const max = maxLeft;
      const cur = scroller.scrollLeft;
      const atEnd = cur >= max - 2 && target.val >= max - 1 && delta > 0;
      const atStart = cur <= 0 && target.val <= 0 && delta < 0;
      if (atEnd || atStart) {
        if (atEnd) {
          e.preventDefault();
          if (!unlockedRef.current) {
            unlockedRef.current = true;
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
            setUnlocked(true);
          }
          window.dispatchEvent(new Event("nav-go-works"));
        } else if (!unlockedRef.current) {
          e.preventDefault();
        }
        return;
      }
      e.preventDefault();
      target.val = Math.max(0, Math.min(max, target.val + delta));
      if (smoothRaf == null) smoothRaf = requestAnimationFrame(smooth);
    };

    let scrollRaf: number | null = null;
    let lastProgress = -1;
    const onScroll = () => {
      if (scrollRaf != null) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        if (smoothRaf == null) {
          target.val = scroller.scrollLeft;
          sampleVelocity();
          if (decayRaf == null) decayRaf = requestAnimationFrame(decay);
        }
        const w = canvasWRef.current;
        const right = scroller.scrollLeft + viewW;
        const p = w > 0 ? Math.min(1, Math.max(0, right / w)) : 0;
        if (Math.abs(p - lastProgress) > 0.001) {
          lastProgress = p;
          setProgress(p);
        }
      });
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    scroller.addEventListener("wheel", onWheel, { passive: false });
    scroller.addEventListener("scroll", onScroll, { passive: true });
    // "Back to top" rewinds the hero itself: stop the wheel easing so the two don't pull against each other.
    const onGoHero = () => {
      if (smoothRaf != null) cancelAnimationFrame(smoothRaf);
      smoothRaf = null;
      target.val = scroller.scrollLeft;
    };
    window.addEventListener("nav-go-hero", onGoHero);
    onScroll();
    const loadTimer = setTimeout(() => setHeroLoaded(true), 150);
    return () => {
      window.removeEventListener("nav-go-hero", onGoHero);
      window.removeEventListener("wheel", onWheel, { capture: true });
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("scroll", onScroll);
      if (smoothRaf != null) cancelAnimationFrame(smoothRaf);
      if (decayRaf != null) cancelAnimationFrame(decayRaf);
      ro.disconnect();
      clearTimeout(loadTimer);
    };
  }, [isMobile]);

  // Blur-in reveal for the absolutely positioned hero elements.
  useEffect(() => {
    if (isMobile) return;
    const scroller = scrollerRef.current;
    const canvas = canvasRef.current;
    if (!scroller || !canvas) return;
    const els = Array.from(
      canvas.querySelectorAll<Element>(":scope > div > .absolute, :scope > div > svg.absolute"),
    );
    els.forEach((el) => {
      if (el.tagName.toLowerCase() !== "svg") el.classList.add("appear");
    });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("is-visible", e.isIntersecting)),
      { root: scroller, threshold: 0.1, rootMargin: "0px 10% 0px 10%" },
    );
    els.forEach((el) => {
      if (el.classList.contains("appear")) io.observe(el);
    });
    return () => io.disconnect();
  }, [isMobile]);

  if (isMobile) {
    return (
      <>
        <Nav />
        <h1 className="sr-only">Vedank Gaur - Design Engineer Portfolio</h1>
        <section aria-labelledby="about-heading" style={{ position: "relative" }}>
          <h2 id="about-heading" className="sr-only">
            About Ved
          </h2>
          <MobileAnatomy />
        </section>
        <section aria-labelledby="works-heading" style={{ position: "relative", zIndex: 2 }}>
          <h2 id="works-heading" className="sr-only">
            Selected work
          </h2>
          {worksReady && <Works />}
        </section>
        {worksReady && <AfterWorks />}
      </>
    );
  }

  const ctaBase = {
    padding: "14px 28px",
    minWidth: 160,
    border: `1px solid ${V.primary}`,
    borderRadius: 2,
    ...type.bodyM,
    cursor: "pointer",
    transition: "background-color 600ms ease, color 600ms ease, border-color 600ms ease",
  };

  return (
    <>
      <Nav />
      <CursorComment introText={HERO.introComment} />
      <h1 className="sr-only">Vedank Gaur - Design Engineer Portfolio</h1>
      <h2 className="sr-only">Hero</h2>
      <RevealLayer unlocked={unlocked}>
        <div
          ref={setWaterHost}
          style={{ position: "absolute", inset: 0, background: V.bg, transition: "background-color 600ms ease" }}
        />
        <main
          ref={scrollerRef}
          className="w-full overflow-x-auto overflow-y-hidden thin-scroll"
          style={{ height: "100vh", position: "relative", zIndex: 1 }}
        >
          <div ref={canvasRef} style={{ width: canvasW, height: "100vh", position: "relative", willChange: "filter" }}>
            <HeroCanvas
              progress={progress}
              heroLoaded={heroLoaded}
              vennTriggerProgress={vennTriggerProgress}
              waterHost={waterHost}
              filterSourceRef={canvasRef}
            />
            <div
              className="absolute"
              style={{
                left: "calc(100vw - 40px)",
                bottom: 19,
                transform: "translateX(-100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 16,
                zIndex: 5,
              }}
            >
              <p className="text-right pointer-events-none" style={{ ...type.bodyM, color: V.primary, whiteSpace: "nowrap" }}>
                {HERO.welcome}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event("force-unlock"));
                    window.dispatchEvent(new Event("nav-go-works"));
                    setTimeout(() => {
                      document.getElementById("works-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 80);
                  }}
                  style={{ ...ctaBase, background: "transparent", color: V.primary }}
                >
                  view work
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`mailto:${PROFILE.email}`, "_blank")}
                  style={{ ...ctaBase, background: V.primary, color: V.bg }}
                >
                  let&apos;s talk
                </button>
              </div>
            </div>
          </div>
        </main>
      </RevealLayer>
      <div style={{ height: unlocked ? N : "100vh" }} />
      <section aria-labelledby="works-heading-desktop">
        <h2 id="works-heading-desktop" className="sr-only">
          Selected work
        </h2>
        {worksReady && <Works />}
      </section>
      {worksReady && <AfterWorks />}
    </>
  );
}
