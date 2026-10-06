import { HERO } from "./content";

/**
 * Server-rendered first paint: background, wordmark and hero title in their final
 * positions, shown instantly while the interactive page (and three.js) loads.
 */
export function HeroSkeleton() {
  return (
    <div className="skeleton" aria-hidden>
      <span className="skeleton-brand">
        <span className="nav-logo" />
        Ved<span style={{ color: "var(--c-accent)" }}>.</span>
      </span>
      <div className="skeleton-title">
        {HERO.titleLines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
    </div>
  );
}
