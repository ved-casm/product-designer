"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { REVEAL_OFFSET as N } from "./assets";

/** Wheel/touch distance needed to slide the hero away / pull it back. */
const REVEAL_THRESHOLD = 12;
const RETURN_THRESHOLD = 80;

/**
 * Fixed layer holding the horizontal hero. Once the hero is scrolled to its end, further
 * downward scroll slides this layer up to reveal the Works section underneath.
 */
export default function RevealLayer({ unlocked, children }: { unlocked: boolean; children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const downAcc = useRef(0);
  const upAcc = useRef(0);
  const pullingBack = useRef(false);
  // While the hero slides back, hide() parks the page at N before settling at 0; that stop at N must not
  // count as scrolling into the works (it re-revealed them, so "back to top" landed on case studies).
  const hidingUntil = useRef(0);

  // Locking again always brings the hero back (adjusted during render, not in an effect).
  const [wasUnlocked, setWasUnlocked] = useState(unlocked);
  if (unlocked !== wasUnlocked) {
    setWasUnlocked(unlocked);
    if (!unlocked) setRevealed(false);
  }

  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  useEffect(() => {
    if (!unlocked) return;

    const reveal = () => {
      downAcc.current = 0;
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.scrollBehavior = "auto";
      window.scrollTo(0, N);
      requestAnimationFrame(() => window.scrollTo(0, N));
      revealedRef.current = true;
      setRevealed(true);
      window.dispatchEvent(new Event("works-revealed"));
    };

    const onScroll = () => {
      const y = window.scrollY;
      if (!revealedRef.current && y >= N && performance.now() >= hidingUntil.current) {
        revealedRef.current = true;
        setRevealed(true);
        window.dispatchEvent(new Event("works-revealed"));
      }
      if (revealedRef.current && y < N) window.scrollTo(0, N);
    };

    const hide = () => {
      pullingBack.current = false;
      downAcc.current = 0;
      upAcc.current = 0;
      revealedRef.current = false;
      hidingUntil.current = performance.now() + 900;
      window.dispatchEvent(new Event("works-hidden"));
      const htmlBehavior = document.documentElement.style.scrollBehavior;
      const bodyBehavior = document.body.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.scrollBehavior = "auto";
      window.scrollTo(0, N);
      setRevealed(false);
      window.setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.style.scrollBehavior = htmlBehavior;
        document.body.style.scrollBehavior = bodyBehavior;
      }, 720);
    };

    const onForceUnlock = () => {
      if (revealedRef.current) hide();
    };
    const onGoHero = () => {
      if (revealedRef.current) hide();
    };
    const onGoWorks = () => {
      if (revealedRef.current) return;
      upAcc.current = 0;
      reveal();
    };
    window.addEventListener("force-unlock", onForceUnlock);
    window.addEventListener("nav-go-hero", onGoHero);
    window.addEventListener("nav-go-works", onGoWorks);

    const scroller = document.querySelector<HTMLElement>(".thin-scroll");
    let maxScroll = scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
    const measure = () => {
      if (scroller) maxScroll = scroller.scrollWidth - scroller.clientWidth;
    };
    const ro = scroller ? new ResizeObserver(measure) : null;
    if (scroller && ro) {
      ro.observe(scroller);
      if (scroller.firstElementChild) ro.observe(scroller.firstElementChild);
    }
    const atEnd = () => (scroller ? scroller.scrollLeft >= maxScroll - 2 : false);

    const handleDelta = (delta: number, e: Event) => {
      if (!revealedRef.current && delta > 0) {
        if (!atEnd()) {
          downAcc.current = 0;
          return;
        }
        e.preventDefault();
        downAcc.current += delta;
        if (downAcc.current >= REVEAL_THRESHOLD) reveal();
        return;
      }
      if (revealedRef.current) {
        if (delta < 0 && window.scrollY <= N + 2) {
          e.preventDefault();
          pullingBack.current = true;
          window.scrollTo(0, N);
          upAcc.current += -delta;
          if (upAcc.current >= RETURN_THRESHOLD) hide();
        } else if (delta > 0) {
          pullingBack.current = false;
          upAcc.current = 0;
        }
      }
    };

    const onWheel = (e: WheelEvent) => handleDelta(e.deltaY, e);
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      const delta = touchY - y;
      touchY = y;
      handleDelta(delta, e);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("force-unlock", onForceUnlock);
      window.removeEventListener("nav-go-hero", onGoHero);
      window.removeEventListener("nav-go-works", onGoWorks);
      ro?.disconnect();
    };
  }, [unlocked]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2,
        transform: revealed ? "translateY(-100vh)" : "translateY(0)",
        transition: "transform 700ms cubic-bezier(0.7, 0, 0.2, 1)",
        willChange: "transform",
        pointerEvents: revealed ? "none" : "auto",
      }}
    >
      {children}
    </div>
  );
}
