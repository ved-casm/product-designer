"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BADGE_PATH } from "../paths";
import { useIsMobile } from "../useIsMobile";
import { Sparkle } from "./Clients";
import { CONTACT, PROFILE } from "./content";
import { type, useTheme, V } from "./theme";
import dynamic from "next/dynamic";

const LakeScene = dynamic(() => import("./LakeScene"), { ssr: false });
import WaterStream from "./LazyWaterStream";

export const GO_FLOW_EVENT = "v2-go-flow";

const VB = 267;

function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

function LocalTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: PROFILE.timeZone,
  }).format(now);
  return (
    <span>
      {PROFILE.location.split(",")[0].toLowerCase()} · {time.toLowerCase()}
    </span>
  );
}

/** Portrait clipped to the venn badge shape, outlined by the water stream once in view. */
function PortraitBadge({ size, drawn }: { size: number; drawn: boolean }) {
  const { theme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const clip = useId().replace(/:/g, "");
  const pad = (40 * size) / VB;
  return (
    <div className="contact-portrait" style={{ width: size, height: size }}>
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id={clip}>
            <path d={BADGE_PATH} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <image
            className="contact-portrait-img"
            href={PROFILE.portrait}
            x="0"
            y="0"
            width={VB}
            height={VB}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      </svg>
      <WaterStream
        svgRef={svgRef}
        viewBox={{ w: VB, h: VB }}
        theme={theme}
        streams={[
          {
            d: BADGE_PATH,
            normalized: true,
            start: 0,
            end: drawn ? 1 : 0,
            duration: 1800,
            easing: "ease-in-out",
            width: 5,
            glowScale: 1.7,
            joinStart: true,
            joinEnd: true,
          },
        ]}
        style={{ position: "absolute", left: -pad, top: -pad, width: size + pad * 2, height: size + pad * 2 }}
      />
      <span className="contact-sparkle">
        <Sparkle size={size * 0.12} />
      </span>
    </div>
  );
}

const LINKS = [
  { label: "linkedin", href: PROFILE.linkedin },
  { label: "github", href: PROFILE.github },
  { label: "behance", href: PROFILE.behance },
  { label: "whatsapp", href: PROFILE.whatsapp },
];

export default function Contact() {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [sectionRef, inView] = useInView<HTMLElement>(0.2);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      window.dispatchEvent(
        new CustomEvent("cursor-comment:show", {
          detail: { id: "copied", text: CONTACT.copied, bg: "#12B76A", border: "#039855", shadow: "rgba(18,183,106,0.16)" },
        }),
      );
    } catch {
      window.location.href = `mailto:${PROFILE.email}`;
    }
  };

  return (
    <section id="contact-section" ref={sectionRef} className="contact" aria-labelledby="contact-heading">
      <div className="contact-grid">
        <div className="contact-copy">
          <p style={{ ...type.bodyM, color: V.tertiary }}>{CONTACT.eyebrow}</p>
          <h2 id="contact-heading" className="contact-heading">
            <span className="contact-heading-small">{CONTACT.heading.before}</span>
            <span>
              {CONTACT.heading.lead}
              <em style={{ color: V.accent }}>{CONTACT.heading.italic}</em>
              {CONTACT.heading.after}
            </span>
          </h2>

          <p className="contact-available">
            <span className="contact-dot" />
            {CONTACT.availability}
          </p>

          <button
            type="button"
            className="contact-email"
            onClick={copyEmail}
            onMouseEnter={() =>
              window.dispatchEvent(
                new CustomEvent("cursor-comment:show", { detail: { id: "copy-hint", text: CONTACT.emailHint } }),
              )
            }
            onMouseLeave={() =>
              window.dispatchEvent(new CustomEvent("cursor-comment:hide", { detail: { id: "copy-hint" } }))
            }
          >
            {PROFILE.email}
            <span className="pcard-line" />
          </button>

          <div className="contact-links">
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="contact-chip">
                {l.label} <span>↗</span>
              </a>
            ))}
            {PROFILE.resume && (
              <a href={PROFILE.resume} download className="resume-btn resume-btn--lg">
                <span>download resume</span>
                <span className="resume-btn-icon" aria-hidden>
                  ↓
                </span>
              </a>
            )}
          </div>
        </div>

        <PortraitBadge size={isMobile ? 240 : 360} drawn={inView} />
      </div>

      <div className="contact-foot">
        <LakeScene theme={theme} className="contact-lake" />
        <div className="contact-lake-caption">
          <p>{CONTACT.lake}</p>
          <span>{CONTACT.lakeHint}</span>
        </div>
        <div className="contact-foot-row">
          <span className="contact-logo" role="img" aria-label="Vedank Gaur logo" />
          <span>{CONTACT.footer}</span>
          <LocalTime />
          <span>© {new Date().getFullYear()}</span>
          <button type="button" className="contact-top" onClick={() => window.dispatchEvent(new Event(GO_FLOW_EVENT))}>
            back to top ↑
          </button>
        </div>
      </div>
    </section>
  );
}
