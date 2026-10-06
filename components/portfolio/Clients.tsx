"use client";

import { CLIENTS, TESTIMONIALS } from "./content";
import { type, V } from "./theme";

/** Four-point sparkle from the VV monogram. */
export function Sparkle({ size = 22, color = V.accent }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flex: "none" }}>
      <path d="M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z" fill={color} />
    </svg>
  );
}

function Row() {
  return (
    <div className="clients-row" aria-hidden>
      {CLIENTS.names.map((name) => (
        <span key={name} className="clients-item">
          <span className="clients-name">{name}</span>
          <Sparkle size={20} />
        </span>
      ))}
    </div>
  );
}

export default function Clients() {
  return (
    <section className="clients" aria-labelledby="clients-heading">
      <p id="clients-heading" style={{ ...type.bodyM, color: V.tertiary, textAlign: "center" }}>
        {CLIENTS.label}
      </p>
      <p className="sr-only">{CLIENTS.names.join(", ")}</p>
      <div className="clients-marquee">
        <div className="clients-track">
          <Row />
          <Row />
        </div>
      </div>

      {TESTIMONIALS.length > 0 && (
        <div className="testimonials">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="testimonial">
              <Sparkle size={18} />
              <blockquote style={{ ...type.displayL, fontSize: "clamp(22px, 2.2vw, 28px)", color: V.primary, margin: "16px 0 0" }}>
                “{t.quote}”
              </blockquote>
              <figcaption style={{ ...type.bodyS, marginTop: 18 }}>
                <span style={{ color: V.primary }}>{t.name}</span> · {t.role}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
