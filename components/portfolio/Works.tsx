"use client";

import Link from "next/link";
import Picture from "../Picture";
import { Fragment, useEffect, useRef, useState } from "react";
import Showcase from "./Showcase";
import { PROJECTS, WORKS, type Project } from "./content";
import { type, V } from "./theme";

function Toolkit() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
      <p style={{ ...type.bodyM, color: "rgba(255,255,255,0.55)", margin: 0 }}>{WORKS.toolkitLabel}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxWidth: 520 }}>
        {WORKS.toolkit.map((tool) => (
          <span
            key={tool}
            style={{
              ...type.bodyS,
              color: "#FFFFFF",
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {tool}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ index, title, desc, role, year, impact, bg, image, video, tags, url }: Project & { index: number }) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!video) return;
    const media = mediaRef.current;
    const v = videoRef.current;
    if (!media || !v) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (v.paused) v.play().catch(() => {});
          } else {
            if (!v.paused) v.pause();
            v.currentTime = 0;
          }
        }
      },
      { rootMargin: "-25% 0px -25% 0px", threshold: 0 },
    );
    io.observe(media);
    return () => io.disconnect();
  }, [video]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <article>
      {/* A real link: crawlable, opens in a new tab, and Next prefetches it. */}
      <Link href={url} className="pcard">
      <div ref={mediaRef} className="pcard-media" style={{ background: bg }} onMouseMove={onMove}>
        {video ? (
          <video ref={videoRef} className="pcard-img" src={video} poster={image.replace(/\.avif$/, ".webp")} muted loop playsInline preload="metadata" />
        ) : (
          <Picture className="pcard-img" src={image} small={480} sizes="(max-width: 767px) 100vw, 50vw" alt={title} loading="lazy" decoding="async" />
        )}
        <div className="pcard-shade" />
        <span className="pcard-index">{String(index + 1).padStart(2, "0")}</span>
        <span className="pcard-cursor" style={{ left: cursor.x, top: cursor.y }}>
          view case study ↗
        </span>
      </div>
      <div className="pcard-meta">
        <div className="pcard-row">
          <h3 className="pcard-title">
            {title}
            <span className="pcard-arrow">↗</span>
          </h3>
          <span className="pcard-role">
            {role}
            {year ? ` · ${year}` : ""}
          </span>
        </div>
        <p className="pcard-desc">{desc}</p>
        {impact && <p className="pcard-impact">{impact}</p>}
        <div className="pcard-foot">
          <p className="pcard-tags">{tags.join("  ·  ")}</p>
          <span className="pcard-line" />
        </div>
      </div>
      </Link>
    </article>
  );
}

/** Intro, toolkit, filters and every project card - the /work page. */
export function WorkGrid() {
  const [visibleCount, setVisibleCount] = useState(PROJECTS.length);
  const [active, setActive] = useState<string[]>([]);
  const toggle = (tag: string) =>
    setActive((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  const shown = PROJECTS.filter((p) => active.length === 0 || p.tags.some((t) => active.includes(t)));

  return (
      <div
        style={{
          position: "relative",
          marginTop: 0,
          paddingLeft: "clamp(16px, 3vw, 32px)",
          paddingRight: "clamp(16px, 3vw, 32px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(16px, 3vw, 32px)",
          alignItems: "flex-start",
        }}
      >
        <div
          className="wgrid-aside"
          style={{
            ...type.displayL,
            top: 120,
            flex: "1 1 280px",
            minWidth: 0,
            color: "#FFF",
            textWrap: "balance",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div>
            <h2 style={{ margin: 0, font: "inherit", letterSpacing: "inherit", textWrap: "balance" }}>{WORKS.intro}</h2>
            <p
              className="wgrid-sub"
              style={{
                ...type.bodyL,
                marginBottom: 0,
                color: "rgba(255,255,255,0.55)",
                maxWidth: 460,
              }}
            >
              {WORKS.sub}
            </p>
          </div>
          <Toolkit />
          <div>
            <p className="wgrid-label" style={{ ...type.bodyM, color: "rgba(255,255,255,0.55)" }}>
              {WORKS.filterLabel}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
              {[WORKS.filters.slice(0, 3), WORKS.filters.slice(3)].map((row, i) => (
                <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {row.map((tag) => {
                    const on = active.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggle(tag)}
                        style={{
                          ...type.bodyS,
                          padding: "8px 16px",
                          borderRadius: 2,
                          border: `1px solid ${on ? V.accent : "rgba(255,255,255,0.2)"}`,
                          background: on ? V.accent : "transparent",
                          color: on ? "#000000" : "#FFFFFF",
                          cursor: "pointer",
                          transition: "background 0.15s, color 0.15s, border-color 0.15s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          className="wgrid-list"
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 64,
          }}
        >
          {shown.map((project, i) => {
            const remaining = shown.length - visibleCount;
            const showMoreHere = i === visibleCount - 1 && remaining > 0;
            return (
              <Fragment key={project.title}>
                {i < visibleCount && <ProjectCard {...project} index={i} />}
                {showMoreHere && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 5)}
                    className="pmore"
                  >
                    +{remaining} more. {visibleCount === 5 ? "interested?" : "still interested?"}
                  </button>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
  );
}

/** Home case-studies section: the projector room. */
export default function Works() {
  return (
    <section id="works-section" className="w-full" style={{ position: "relative" }}>
      <Showcase />
    </section>
  );
}
