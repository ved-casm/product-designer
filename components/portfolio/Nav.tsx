"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { REVEAL_OFFSET } from "../assets";
import { serif, WEIGHT } from "../typography";
import { useIsMobile } from "../useIsMobile";
import { GO_FLOW_EVENT } from "./Contact";
import { PROFILE } from "./content";
import { type, useTheme, V } from "./theme";

function ThemeToggle({ color }: { color: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        border: `1px solid ${color}`,
        background: "transparent",
        color,
        display: "grid",
        placeItems: "center",
        pointerEvents: "auto",
        cursor: "pointer",
        opacity: 0.85,
        transition: "color 300ms ease, border-color 300ms ease",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        style={{ transform: `rotate(${dark ? 0 : -90}deg)`, transition: "transform 600ms cubic-bezier(0.2, 0.9, 0.3, 1.2)" }}
      >
        {dark ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" stroke="none" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <line key={a} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${a} 12 12)`} />
            ))}
          </>
        )}
      </svg>
    </button>
  );
}

export default function Nav() {
  const isMobile = useIsMobile();
  const [overWorks, setOverWorks] = useState(false);
  const [pastSeparator, setPastSeparator] = useState(false);
  const [lower, setLower] = useState(false);
  const [overProcess, setOverProcess] = useState(false);
  const revealed = useRef(false);

  useEffect(() => {
    let raf: number | null = null;
    const update = () => {
      const after = document.getElementById("process-section")?.getBoundingClientRect();
      const isLower = (isMobile || revealed.current) && !!after && after.top <= 88;
      // Always set: a stale value from a previous layout (e.g. desktop → mobile resize)
      // must not survive. React skips the render when nothing changed.
      setLower(isLower);
      // The process section is always dark, so the nav goes light over it.
      const inProcess = (isMobile || revealed.current) && !!after && after.top <= 88 && after.bottom > 88;
      setOverProcess(inProcess);
      const rect = document.getElementById("works-section")?.getBoundingClientRect();
      const inWorks = !!rect && rect.top <= 88 && rect.bottom > 88;
      const over = (isMobile || revealed.current) && inWorks;
      let past: boolean;
      if (isMobile) past = false;
      else {
        const sep = document.getElementById("works-separator")?.getBoundingClientRect();
        past = over && !!sep && sep.top <= 88;
      }
      setOverWorks(over);
      setPastSeparator(past);
    };
    const onScroll = () => {
      if (raf == null)
        raf = requestAnimationFrame(() => {
          raf = null;
          update();
        });
    };
    const onRevealed = () => {
      revealed.current = true;
      update();
    };
    const onHidden = () => {
      revealed.current = false;
      setOverProcess(false);
      setOverWorks(false);
      setPastSeparator(false);
      setLower(false);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("works-revealed", onRevealed);
    window.addEventListener("works-hidden", onHidden);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("works-revealed", onRevealed);
      window.removeEventListener("works-hidden", onHidden);
    };
  }, [isMobile]);

  // The case-studies room follows the theme, so only the always-dark process section forces light text.
  const color = overProcess ? "#FFFFFF" : V.primary;

  const resetPage = () => {
    window.dispatchEvent(new Event("wordle-cancel"));
    document.body.style.cssText = "";
    document.documentElement.style.overflow = "";
  };

  const goFlow = () => {
    resetPage();
    const wasInWorks = window.scrollY > REVEAL_OFFSET;
    window.dispatchEvent(new Event("nav-go-hero"));
    const scroller = document.querySelector<HTMLElement>(".thin-scroll");
    const replay = () => window.dispatchEvent(new Event("replay-hero"));
    const rewind = () => {
      if (!scroller || scroller.scrollLeft === 0) {
        if (isMobile) window.scrollTo({ top: 0, behavior: "smooth" });
        replay();
        return;
      }
      const from = scroller.scrollLeft;
      const start = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / 900);
        scroller.scrollLeft = from * (1 - ease(t));
        if (t < 1) requestAnimationFrame(frame);
        else replay();
      };
      requestAnimationFrame(frame);
    };
    if (wasInWorks && !isMobile) window.setTimeout(rewind, 760);
    else rewind();
  };

  const goSection = (id: string) => {
    resetPage();
    window.dispatchEvent(new CustomEvent("cursor-comment:hide", { detail: {} }));
    if (!overWorks && !lower) {
      window.dispatchEvent(new Event("force-unlock"));
      window.dispatchEvent(new Event("nav-go-works"));
    }
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  // Footer "back to top" asks the nav to run the same rewind as the logo.
  useEffect(() => {
    const onGoFlow = () => goFlow();
    window.addEventListener(GO_FLOW_EVENT, onGoFlow);
    return () => window.removeEventListener(GO_FLOW_EVENT, onGoFlow);
  });

  const clickable: CSSProperties = { cursor: "pointer", pointerEvents: "auto" };
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const links = (
    <>
      <p onClick={() => (closeMenu(), goFlow())} style={clickable}>
        flow
      </p>
      <p onClick={() => (closeMenu(), goSection("works-section"))} style={clickable}>
        case studies
      </p>
      <p onClick={() => (closeMenu(), goSection("process-section"))} style={clickable}>
        process
      </p>
      <p onClick={() => (closeMenu(), goSection("contact-section"))} style={clickable}>
        contact
      </p>
      {PROFILE.resume && (
        <a href={PROFILE.resume} download className="resume-btn" style={clickable} onClick={closeMenu}>
          <span>resume</span>
          <span className="resume-btn-icon" aria-hidden>
            ↓
          </span>
        </a>
      )}
    </>
  );

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 top-0 z-50 pointer-events-none"
      style={{
        color,
        transition: "color 300ms ease, background-color 300ms ease, border-color 300ms ease",
        background: pastSeparator
          ? V.works
          : isMobile && menuOpen
            ? V.bg
            : overProcess
              ? "rgba(0,0,0,0.55)"
              : lower
                ? "color-mix(in srgb, var(--c-bg) 78%, transparent)"
              : "transparent",
        backdropFilter: lower && !pastSeparator ? "blur(14px) saturate(1.3)" : undefined,
        WebkitBackdropFilter: lower && !pastSeparator ? "blur(14px) saturate(1.3)" : undefined,
        height: 88,
        borderBottom: pastSeparator
          ? "1px solid rgba(255,255,255,0.15)"
          : lower
            ? "1px solid rgba(127,127,127,0.15)"
            : "1px solid transparent",
      }}
    >
      <p
        onClick={goFlow}
        className="absolute nav-brand"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          ...serif(isMobile ? 28 : 32, WEIGHT.semibold),
          fontStyle: "italic",
          left: isMobile ? 24 : 32,
          top: 38,
          color,
          ...clickable,
        }}
      >
        <span className="nav-logo" role="img" aria-label="VV monogram" />
        <span>
          {PROFILE.name}
          <span style={{ color: V.accent }}>.</span>
        </span>
      </p>
      {isMobile ? (
        <>
          <div className="absolute flex items-center" style={{ right: 64, top: 28, gap: 12 }}>
            <ThemeToggle color={color} />
          </div>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
            className="absolute flex flex-col justify-center gap-[5px]"
            style={{
              right: 20,
              top: 32,
              width: 28,
              height: 28,
              padding: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          >
            {["translateY(3.5px) rotate(45deg)", "translateY(-3.5px) rotate(-45deg)"].map((openTransform) => (
              <span
                key={openTransform}
                style={{
                  display: "block",
                  width: 22,
                  height: 2,
                  background: color,
                  transformOrigin: "center",
                  transform: menuOpen ? openTransform : "none",
                  transition: "transform 250ms ease, background-color 250ms ease",
                }}
              />
            ))}
          </button>
          <div
            style={{
              position: "fixed",
              top: 88,
              left: 0,
              right: 0,
              background: V.bg,
              borderBottom: menuOpen ? "1px solid rgba(127,127,127,0.2)" : "1px solid transparent",
              transform: menuOpen ? "translateY(0)" : "translateY(-110%)",
              opacity: menuOpen ? 1 : 0,
              transition:
                "transform 320ms cubic-bezier(0.4,0,0.2,1), opacity 220ms ease, background-color 300ms ease",
              pointerEvents: menuOpen ? "auto" : "none",
              padding: "24px 24px 32px",
              ...type.titleM,
              color,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {links}
          </div>
        </>
      ) : (
        <div
          className="absolute flex items-center justify-end gap-[24px] text-right"
          style={{ right: 32, top: 32, padding: 10, ...type.titleM, whiteSpace: "nowrap", color }}
        >
          {links}
          <ThemeToggle color={color} />
        </div>
      )}
    </nav>
  );
}
