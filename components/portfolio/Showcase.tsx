"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PROJECTS } from "./content";
import { useTheme } from "./theme";

const ProjectorRoom = dynamic(() => import("./ProjectorRoom"), { ssr: false });

/**
 * Case studies on the home page: a pinned screening room. Scrolling dollies the camera from the
 * ceiling rig down to face the screen; then the projects play on it.
 */
export default function Showcase() {
  const { theme } = useTheme();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  // The room (three.js + slides + video) mounts only once the visitor actually scrolls toward it.
  const [armed, setArmed] = useState(false);
  const project = PROJECTS[index];
  const total = PROJECTS.length;
  const slides = useMemo(
    () => PROJECTS.map((p) => ({ image: `/media/projects/${p.slug}/01.webp`, video: p.video })),
    [],
  );

  const go = useCallback((dir: 1 | -1) => setIndex((i) => (i + dir + total) % total), [total]);
  const open = useCallback(() => router.push(PROJECTS[index].url), [router, index]);

  // Scroll progress through the pinned section → camera path + overlay fades (via a CSS variable).
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const range = Math.max(1, r.height - window.innerHeight);
      // Arrive a little before the end so the last stretch is spent on the screen.
      const p = Math.min(1, Math.max(0, -r.top / (range * 0.8)));
      progressRef.current = p;
      stickyRef.current?.style.setProperty("--p", p.toFixed(3));
      stickyRef.current?.classList.toggle("is-arrived", p > 0.85);
      if (window.scrollY > 0 && r.top < window.innerHeight * 1.75) setArmed(true);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Fetch the room's code while the browser is idle, so it's ready when the visitor gets there.
    const prefetch = window.setTimeout(() => void import("./ProjectorRoom"), 6000);
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(prefetch);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Arrow keys once the camera has arrived.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (progressRef.current < 0.85) return;
      const r = sectionRef.current?.getBoundingClientRect();
      if (!r || r.bottom < window.innerHeight * 0.5 || r.top > 0) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    router.prefetch(PROJECTS[index].url);
  }, [router, index]);

  return (
    <section ref={sectionRef} id="case-studies" className="showcase" aria-roledescription="carousel" aria-label="Case studies">
      <div ref={stickyRef} className="showcase-sticky">
        {armed ? (
          <ProjectorRoom
            slides={slides}
            index={index}
            theme={theme}
            onOpen={open}
            onSwipe={go}
            progressRef={progressRef}
            className="showcase-room"
          />
        ) : (
          <div className="showcase-room room-fallback" aria-hidden />
        )}

        <h2 className="showcase-heading">
          case <em>studies.</em>
        </h2>
        <p className="showcase-scroll" aria-hidden>
          scroll to take a seat ↓
        </p>

        <div className="showcase-arrive">
          <Link href="/work" className="showcase-neon">
            view all works <span aria-hidden>↗</span>
          </Link>
          <p className="showcase-hint" aria-hidden>
            click the screen to open · swipe or ← → to change
          </p>
          <div className="showcase-bar">
            <div className="showcase-meta" aria-live="polite">
              <span className="showcase-count">
                {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
              <h3 key={project.slug} className="showcase-title">
                {project.title}
              </h3>
              <p className="showcase-role">
                {project.role}
                {project.impact ? <span className="showcase-impact"> · {project.impact}</span> : null}
              </p>
            </div>
            <div className="showcase-controls">
              <button type="button" className="showcase-arrow" onClick={() => go(-1)} aria-label="Previous project">
                ←
              </button>
              <button type="button" className="showcase-arrow" onClick={() => go(1)} aria-label="Next project">
                →
              </button>
              <Link href={project.url} className="resume-btn showcase-open">
                <span>view case study</span>
                <span className="resume-btn-icon" aria-hidden>
                  ↗
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
