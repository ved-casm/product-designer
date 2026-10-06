"use client";

import { createContext, useContext, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { type as baseType } from "../typography";
import type { WaterTheme } from "./water-shared";

export const V = {
  bg: "var(--c-bg)",
  primary: "var(--c-primary)",
  secondary: "var(--c-secondary)",
  tertiary: "var(--c-tertiary)",
  line: "var(--c-line)",
  works: "var(--c-works)",
  accent: "var(--c-accent)",
  chip: "var(--c-chip)",
};

const COLOR_TO_VAR: Record<string, string> = {
  "#000": V.primary,
  "#404040": V.secondary,
  "#808080": V.tertiary,
};

const themed = (s: CSSProperties): CSSProperties =>
  typeof s.color === "string" && COLOR_TO_VAR[s.color] ? { ...s, color: COLOR_TO_VAR[s.color] } : s;

/** The v1 type scale, with colours swapped for theme variables. */
export const type = Object.fromEntries(
  Object.entries(baseType).map(([k, v]) => [k, themed(v)]),
) as typeof baseType;

const STORAGE_KEY = "ved-v2-theme";

type ThemeCtx = { theme: WaterTheme; toggle: () => void };
const Ctx = createContext<ThemeCtx>({ theme: "light", toggle: () => {} });

const readTheme = (): WaterTheme => {
  // The inline theme script in the layout has already resolved this before paint.
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

// One theme for the whole page, shared by every provider and kept outside React so that
// server-rendered pages can hydrate with "light" and switch to the real theme right after.
let current: WaterTheme | null = null;
const listeners = new Set<() => void>();
const setCurrent = (next: WaterTheme) => {
  current = next;
  document.documentElement.dataset.theme = next;
  listeners.forEach((l) => l());
};
const getSnapshot = () => current ?? (current = readTheme());
const getServerSnapshot = (): WaterTheme => "light";
const subscribe = (l: () => void) => {
  listeners.add(l);
  // Follow the OS setting live until the visitor picks a theme themselves.
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    setCurrent(mql.matches ? "dark" : "light");
  };
  mql.addEventListener("change", onChange);
  return () => {
    listeners.delete(l);
    mql.removeEventListener("change", onChange);
  };
};
const toggle = () => {
  const next = getSnapshot() === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {}
  setCurrent(next);
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

/** Pins a subtree to one theme (e.g. an always-dark section) regardless of the page theme. */
export function ForceTheme({ theme, children }: { theme: WaterTheme; children: ReactNode }) {
  const parent = useContext(Ctx);
  return <Ctx.Provider value={{ theme, toggle: parent.toggle }}>{children}</Ctx.Provider>;
}
