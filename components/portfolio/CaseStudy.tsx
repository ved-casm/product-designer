"use client";

import dynamic from "next/dynamic";
import Picture from "../Picture";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CursorComment from "../CursorComment";
import { BADGE_PATH as BADGE } from "../paths";
import { useIsMobile } from "../useIsMobile";
import { GO_FLOW_EVENT } from "./Contact";
import { PROFILE, PROJECTS, type PageShot, type Project } from "./content";
import { ThemeProvider, type, useTheme, V } from "./theme";
import WaterBadge from "./WaterBadge";
import WaterStream from "./LazyWaterStream";

const Contact = dynamic(() => import("./Contact"), { ssr: false });

/* ------------------------------------------------------------------ */
/* Classifying the stack                                              */
/* ------------------------------------------------------------------ */

const DESIGN = /ui\/ux|logo|graphic|messaging|motion|content|parallax/i;
const BUILD = /react|next|typescript|tailwind|bootstrap|css|shadcn|aceternity|hero ui|terra|api|socket/i;

type Group = { key: "design" | "build" | "product"; label: string; items: string[]; color: string; deep: string };

function groupStack(stack: string[]): Group[] {
  const design = stack.filter((s) => DESIGN.test(s));
  const build = stack.filter((s) => !DESIGN.test(s) && BUILD.test(s));
  const product = stack.filter((s) => !DESIGN.test(s) && !BUILD.test(s));
  return [
    { key: "design", label: "design", items: design, color: "#FF8A3D", deep: "#C2410C" },
    { key: "build", label: "build", items: build, color: "#2F80FF", deep: "#1E40AF" },
    { key: "product", label: "product", items: product, color: "#1FC7A0", deep: "#0F766E" },
  ];
}

function useInView<T extends Element>(threshold = 0.3, once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
        else if (!once) setInView(false);
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);
  return [ref, inView] as const;
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

export function CaseNav() {
  const { theme, toggle } = useTheme();
  useEffect(() => {
    const top = () => window.scrollTo({ top: 0, behavior: "smooth" });
    window.addEventListener(GO_FLOW_EVENT, top);
    return () => window.removeEventListener(GO_FLOW_EVENT, top);
  }, []);
  return (
    <nav className="case-nav" aria-label="Case study">
      <Link href="/" className="case-brand nav-brand">
        <span className="nav-logo" role="img" aria-label="VV monogram" />
        <span>
          {PROFILE.name}
          <span style={{ color: V.accent }}>.</span>
        </span>
      </Link>
      <div className="case-nav-links">
        <Link href="/work" className="case-back">
          ← all work
        </Link>
        <button type="button" className="case-theme" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? "☾" : "☀"}
        </button>
      </div>
    </nav>
  );
}

/** A wavy stream across the hero that draws itself on load. */
function HeroStream() {
  const { theme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setDrawn(true), 500);
    return () => window.clearTimeout(t);
  }, []);
  const d = "M-20 60 C 180 10, 320 110, 520 60 S 860 0, 1040 56 S 1320 120, 1460 40";
  return (
    <div className="case-hero-stream">
      <svg ref={svgRef} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden />
      <WaterStream
        svgRef={svgRef}
        viewBox={{ w: 1440, h: 120 }}
        theme={theme}
        streams={[{ d, normalized: true, start: 0, end: drawn ? 1 : 0, duration: 2600, easing: "ease-in-out", width: 6 }]}
        style={{ position: "absolute", left: 0, top: -40, width: "100%", height: "calc(100% + 80px)" }}
      />
    </div>
  );
}

function Title({ text }: { text: string }) {
  return (
    <h1 className="case-title" aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} aria-hidden style={{ animationDelay: `${120 + i * 45}ms` }}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </h1>
  );
}

/** Cover that settles from 0.9 to full size as it scrolls into place. */
function Cover({ project }: { project: Project }) {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const v = 1 - Math.min(1, Math.max(0, (r.top - window.innerHeight * 0.15) / (window.innerHeight * 0.75)));
      setP(v);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} className="case-cover" style={{ transform: `scale(${0.9 + p * 0.1})`, borderRadius: 14 - p * 8 }}>
      {project.video ? (
        <video src={project.video} poster={`/media/projects/${project.slug}/01.webp`} autoPlay muted loop playsInline style={{ transform: `scale(${1.12 - p * 0.12})` }} />
      ) : (
        <Picture src={`/media/projects/${project.slug}/01.avif`} small={800} sizes="(max-width: 767px) 100vw, 1280px" alt={`${project.title} cover`} fetchPriority="high" style={{ transform: `scale(${1.12 - p * 0.12})` }} />
      )}
    </div>
  );
}

/** Discover → design → build → ship, with the stream flowing through each stage. */
function Pipeline({ groups }: { groups: Group[] }) {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [wrapRef, inView] = useInView<HTMLDivElement>(0.35);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = useState<{ w: number; h: number; d: string } | null>(null);
  const [stage, setStage] = useState(-1);
  const NODE = isMobile ? 64 : 104;

  const stages = useMemo(
    () => [
      { title: "discover", items: ["user flows", "business goals"], color: "#2F80FF", deep: "#1E40AF" },
      { title: "design", items: groups[0].items, color: "#FF8A3D", deep: "#C2410C" },
      { title: "build", items: groups[1].items, color: "#8B5CF6", deep: "#5B21B6" },
      { title: "ship", items: groups[2].items.length ? groups[2].items : ["launch", "polish"], color: "#1FC7A0", deep: "#0F766E" },
    ],
    [groups],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      // Refs go null while React swaps the nodes (e.g. navigating to another case study); skip that frame.
      const nodes = nodeRefs.current.slice(0, stages.length);
      if (nodes.length < stages.length || nodes.some((n) => !n?.isConnected)) return;
      const w = wrap.getBoundingClientRect();
      const pts = (nodes as HTMLDivElement[]).map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.left - w.left + r.width / 2, y: r.top - w.top + r.height / 2 };
      });
      if (!w.width) return;
      let d: string;
      if (isMobile) {
        d = `M${pts[0].x} 0`;
        let prev = { x: pts[0].x, y: 0 };
        pts.forEach((p, i) => {
          const dir = i % 2 ? -1 : 1;
          d += ` C${prev.x + 22 * dir} ${prev.y + (p.y - prev.y) * 0.4} ${p.x + 22 * dir} ${p.y - (p.y - prev.y) * 0.4} ${p.x} ${p.y}`;
          prev = p;
        });
        d += ` L${prev.x} ${w.height}`;
      } else {
        d = `M0 ${pts[0].y}`;
        let prev = { x: 0, y: pts[0].y };
        pts.forEach((p, i) => {
          const dir = i % 2 ? -1 : 1;
          d += ` C${prev.x + (p.x - prev.x) * 0.4} ${prev.y + 70 * dir} ${p.x - (p.x - prev.x) * 0.4} ${p.y + 70 * dir} ${p.x} ${p.y}`;
          prev = p;
        });
        d += ` C${prev.x + 80} ${prev.y - 60} ${w.width - 80} ${prev.y + 60} ${w.width} ${prev.y}`;
      }
      setGeo({ w: w.width, h: w.height, d });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [isMobile, wrapRef, stages.length]);

  // The water reaches each stage in turn.
  useEffect(() => {
    if (!inView) return;
    const timers = stages.map((_, i) => window.setTimeout(() => setStage(i), 500 + i * 650));
    return () => timers.forEach(clearTimeout);
  }, [inView, stages]);

  return (
    <div ref={wrapRef} className="case-pipeline">
      <svg ref={svgRef} className="case-pipeline-svg" viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : "0 0 1 1"} preserveAspectRatio="none" aria-hidden />
      {geo && (
        <WaterStream
          svgRef={svgRef}
          viewBox={{ w: geo.w, h: geo.h }}
          theme={theme}
          streams={[
            { d: geo.d, normalized: true, start: 0, end: inView ? 1 : 0, duration: 3200, easing: "ease-in-out", width: 6, joinStart: true },
          ]}
          style={{ position: "absolute", left: 0, top: -60, width: "100%", height: "calc(100% + 120px)", zIndex: 0 }}
        />
      )}
      {stages.map((s, i) => (
        <div key={s.title} className="case-stage">
          <div
            className="case-stage-node"
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
            style={{ width: NODE, height: NODE }}
          >
            <WaterBadge
              size={NODE}
              fill={s.color}
              deep={s.deep}
              drawn={stage >= i}
              filled={stage >= i}
              drawDuration={700}
              label={String(i + 1).padStart(2, "0")}
              labelStyle={{ ...type.titleM, fontSize: isMobile ? 14 : 18, color: V.primary, left: NODE / 2, top: NODE / 2 - 11 }}
            />
          </div>
          <div className="case-stage-copy" style={{ opacity: stage >= i ? 1 : 0.25 }}>
            <h3>{s.title}</h3>
            <ul>
              {s.items.map((it) => (
                <li key={it}>{it.toLowerCase()}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Three vessels filled in proportion to how much of the project sat in each discipline. */
function Ownership({ groups }: { groups: Group[] }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  const isMobile = useIsMobile();
  const shown = groups.filter((g) => g.items.length > 0);
  const total = shown.reduce((n, g) => n + g.items.length, 0) || 1;
  const SIZE = isMobile ? 120 : 200;
  return (
    <div ref={ref} className="case-own" style={{ gridTemplateColumns: isMobile ? "1fr" : `repeat(${shown.length}, 1fr)` }}>
      {shown.map((g, i) => {
        const share = g.items.length / total;
        return (
          <div key={g.key} className="case-own-item">
            <div style={{ position: "relative", width: SIZE, height: SIZE }}>
              <OwnershipBadge size={SIZE} group={g} level={inView ? 0.18 + share * 0.72 : 0} delay={i * 250} />
            </div>
            <p className="case-own-pct">{Math.round(share * 100)}%</p>
            <p className="case-own-label">{g.label}</p>
            <p className="case-own-items">{g.items.length ? g.items.join(" · ").toLowerCase() : "-"}</p>
          </div>
        );
      })}
    </div>
  );
}

function OwnershipBadge({ size, group, level, delay }: { size: number; group: Group; level: number; delay: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (level <= 0) return;
    const t = window.setTimeout(() => setOn(true), delay);
    return () => window.clearTimeout(t);
  }, [level, delay]);
  return (
    <WaterBadgeLevel size={size} fill={group.color} deep={group.deep} level={on ? level : 0} />
  );
}

/** A badge with an explicit liquid level (the ownership chart needs partial fills). */
function WaterBadgeLevel({ size, fill, deep, level }: { size: number; fill: string; deep: string; level: number }) {
  const { theme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const pad = (40 * size) / 267;
  return (
    <>
      <svg ref={svgRef} width={size} height={size} viewBox="0 0 267 267" style={{ position: "absolute", inset: 0 }} aria-hidden />
      <WaterStreamBadge svgRef={svgRef} theme={theme} level={level} fill={fill} deep={deep} pad={pad} size={size} />
    </>
  );
}

function WaterStreamBadge({
  svgRef,
  theme,
  level,
  fill,
  deep,
  pad,
  size,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  theme: "light" | "dark";
  level: number;
  fill: string;
  deep: string;
  pad: number;
  size: number;
}) {
  return (
    <WaterStream
      svgRef={svgRef}
      viewBox={{ w: 267, h: 267 }}
      theme={theme}
      streams={[
        {
          d: BADGE,
          normalized: true,
          start: 0,
          end: level > 0 ? 1 : 0,
          duration: 1200,
          easing: "ease-in-out",
          width: 5,
          glowScale: 1.7,
          joinStart: true,
          joinEnd: true,
        },
      ]}
      liquid={{ level, duration: 2600, color: fill, deep, mask: BADGE }}
      style={{ position: "absolute", left: -pad, top: -pad, width: size + pad * 2, height: size + pad * 2 }}
    />
  );
}

function Gallery({ project, onOpen }: { project: Project; onOpen: (src: string) => void }) {
  const shots = Array.from({ length: project.shots - 1 }, (_, i) => `/media/projects/${project.slug}/${String(i + 2).padStart(2, "0")}.avif`);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".case-shot"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [project.slug]);
  return (
    <div className="case-gallery">
      {shots.map((src, i) => {
        const variant = i < 2 ? "half" : i % 3 === 0 ? "full" : i % 3 === 1 ? "inset-l" : "inset-r";
        return (
          <button key={src} type="button" className={`case-shot case-shot--${variant}`} onClick={() => onOpen(src)}>
            <Picture
              src={src}
              small={800}
              sizes={variant === "half" ? "(max-width: 767px) 100vw, 640px" : "(max-width: 767px) 100vw, 1280px"}
              alt={`${project.title} screen ${i + 2}`}
              loading="lazy"
              decoding="async"
            />
          </button>
        );
      })}
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);
  return (
    <div className={`case-lightbox${src ? " is-open" : ""}`} onClick={onClose} role="dialog" aria-hidden={!src}>
      {src && <Picture src={src} alt="" />}
      <span className="case-lightbox-hint">esc / click to close</span>
    </div>
  );
}

function NextProject({ next }: { next: Project }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <Link
      href={`/work/${next.slug}`}
      className="case-next"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
    >
      <span className="case-next-eyebrow">next project</span>
      <span className="case-next-title">
        {next.title} <span className="pcard-arrow">↗</span>
      </span>
      <span className="pcard-line" />
      <Picture className="case-next-peek" src={next.image} small={480} sizes="400px" alt="" style={{ left: pos.x, top: pos.y }} />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

/** Overview (the goal) beside the solution and its three pillars, then the way out to the live product. */
function Brief({ project }: { project: Project }) {
  return (
    <section className="case-brief">
      <div className="case-reveal">
        <h2 className="case-label">overview</h2>
        <p className="case-brief-big">{project.goal}</p>
      </div>
      <div className="case-reveal">
        <h2 className="case-label">solution</h2>
        <p className="case-solution">{project.solution}</p>
        <ol className="case-pillars">
          {project.pillars.map((p, i) => (
            <li key={p.title}>
              <span className="case-pillar-n">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
        {project.live && (
          <a href={project.live} target="_blank" rel="noopener noreferrer" className="resume-btn case-visit">
            <span>visit website</span>
            <span className="resume-btn-icon" aria-hidden>
              ↗
            </span>
          </a>
        )}
      </div>
    </section>
  );
}

const pageSrc = (slug: string, key: string, kind: "desktop" | "mobile") => `/media/projects/${slug}/pages/${key}-${kind}.avif`;

/** Every key page at desktop size, in a browser frame, numbered like a design file. */
function Designs({ project, pages, onOpen }: { project: Project; pages: PageShot[]; onOpen: (src: string) => void }) {
  const host = project.live ? new URL(project.live).host : "";
  return (
    <section className="case-section">
      <div className="case-section-head case-reveal">
        <p className="case-label">the designs</p>
        <h2>
          page by <em>page.</em>
        </h2>
      </div>
      <div className="case-pages">
        {pages.map((pg, i) => {
          const src = pageSrc(project.slug, pg.key, "desktop");
          return (
            <figure key={pg.key} className={`case-page case-reveal${i % 2 ? " case-page--r" : ""}`}>
              <figcaption>
                <span className="case-page-n">/ dsgn {String(i + 1).padStart(2, "0")}</span>
                <span>{pg.label}</span>
              </figcaption>
              <button type="button" className="case-browser" onClick={() => onOpen(src)} aria-label={`Enlarge ${pg.label}`}>
                <span className="case-browser-bar" aria-hidden>
                  <i />
                  <i />
                  <i />
                  <span className="case-browser-url">
                    {host}
                    {pg.path === "/" ? "" : pg.path}
                  </span>
                </span>
                <Picture
                  src={src}
                  small={800}
                  sizes="(max-width: 767px) 100vw, 1100px"
                  alt={`${project.title}: ${pg.label}, desktop`}
                  loading="lazy"
                  decoding="async"
                  width={1600}
                  height={1000}
                />
              </button>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

/** The same product on a phone: three iPhone frames, the middle one lifted. */
function Adaptive({ project, screens }: { project: Project; screens: PageShot[] }) {
  return (
    <section className="case-section case-adaptive">
      <div className="case-section-head case-reveal">
        <p className="case-label">adaptive design</p>
        <h2>
          made for the <em>thumb, too.</em>
        </h2>
      </div>
      <div className="case-phones">
        {screens.map((s) => (
          <figure key={s.key} className="case-phone case-reveal">
            <div className="iphone">
              <span className="iphone-island" aria-hidden />
              <div className="iphone-screen">
                <Picture
                  src={pageSrc(project.slug, s.key, "mobile")}
                  alt={`${project.title}: ${s.label}, on iPhone`}
                  loading="lazy"
                  decoding="async"
                  width={780}
                  height={1688}
                />
              </div>
            </div>
            <figcaption>{s.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function CaseStudyInner({ slug }: { slug: string }) {
  const index = PROJECTS.findIndex((p) => p.slug === slug);
  const project = PROJECTS[index];
  const next = PROJECTS[(index + 1) % PROJECTS.length];
  const groups = useMemo(() => groupStack(project.stack), [project.stack]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".case-reveal"));
    els.forEach((el) => el.classList.add("appear"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("is-visible", e.isIntersecting)),
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [slug]);

  return (
    <>
      <CaseNav />
      <CursorComment introText={`${project.title}, by Ved.`} delay={2600} />
      <main className="case">
        <header className="case-hero">
          <p className="case-eyebrow">
            case study · {String(index + 1).padStart(2, "0")} / {String(PROJECTS.length).padStart(2, "0")}
          </p>
          <Title text={project.title} />
          <p className="case-tagline">{project.desc}</p>
          <dl className="case-meta">
            <div>
              <dt>challenge</dt>
              <dd>{project.challenge}</dd>
            </div>
            <div>
              <dt>service</dt>
              <dd>{project.service}</dd>
            </div>
            <div>
              <dt>industry</dt>
              <dd>{project.industry}</dd>
            </div>
            {project.year && (
              <div>
                <dt>year</dt>
                <dd>{project.year}</dd>
              </div>
            )}
          </dl>
          {project.impact && (
            <div className="case-actions">
              <p className="case-impact">{project.impact}</p>
            </div>
          )}
          <HeroStream />
        </header>

        <Cover project={project} />

        <Brief project={project} />

        {project.pages && <Designs project={project} pages={project.pages} onOpen={setLightbox} />}

        {project.mobile && <Adaptive project={project} screens={project.mobile} />}

        <section className="case-section">
          <div className="case-section-head case-reveal">
            <p className="case-label">how it flowed</p>
            <h2>
              from a blank file <em>to production.</em>
            </h2>
          </div>
          <Pipeline groups={groups} />
        </section>

        <section className="case-section">
          <div className="case-section-head case-reveal">
            <p className="case-label">what i owned</p>
            <h2>
              every discipline, <em>poured where it belongs.</em>
            </h2>
          </div>
          <Ownership groups={groups} />
        </section>

        <section className="case-section">
          <div className="case-section-head case-reveal">
            <p className="case-label">the screens</p>
            <h2>
              a closer look<em>.</em>
            </h2>
          </div>
          <Gallery project={project} onOpen={setLightbox} />
        </section>

        {project.outcome && (
          <section className="case-brief case-reveal">
            <div>
              <p className="case-label">the outcome</p>
              <p className="case-brief-big">{project.outcome}</p>
            </div>
          </section>
        )}

        <NextProject next={next} />
      </main>
      <Contact />
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}

export default function CaseStudy({ slug }: { slug: string }) {
  return (
    <ThemeProvider>
      {/* Keyed by slug: moving between case studies starts each one fresh (animations, lightbox, measurements). */}
      <CaseStudyInner key={slug} slug={slug} />
    </ThemeProvider>
  );
}
