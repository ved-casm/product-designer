"use client";

import { useSyncExternalStore } from "react";

export const MOBILE_BREAKPOINT = 768;

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
const getSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT;
// Server-rendered pages start as desktop and switch right after hydration.
const getServerSnapshot = () => false;

/** True below the mobile breakpoint. Client-only trees get the right answer on their very first render. */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
