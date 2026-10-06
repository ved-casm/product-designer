import type { CSSProperties } from "react";

export const WEIGHT = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;

export const COLOR = {
  primary: "#000",
  secondary: "#404040",
  tertiary: "#808080",
  inverse: "#FFF",
} as const;

export const sans = (
  size: number,
  weight: number = WEIGHT.medium,
  color: string = COLOR.secondary,
): CSSProperties => ({
  fontFamily: "'Inter', 'Inter Fallback', sans-serif",
  fontWeight: weight,
  fontSize: size,
  letterSpacing: `${-0.04 * size}px`,
  color,
  lineHeight: 1.2,
  margin: 0,
});

export const serif = (
  size: number,
  weight: number = WEIGHT.medium,
  color: string = COLOR.primary,
  italic = false,
): CSSProperties => ({
  fontFamily: "'Newsreader', 'Newsreader Fallback', serif",
  fontWeight: weight,
  fontStyle: italic ? "italic" : "normal",
  fontSize: size,
  letterSpacing: `${-0.04 * size}px`,
  color,
  lineHeight: 1,
  margin: 0,
});

export const type = {
  displayXL: { ...serif(48), fontSize: "clamp(36px, 7vw, 48px)", lineHeight: 1 },
  displayL: {
    ...serif(36),
    fontSize: "clamp(28px, 5.5vw, 36px)",
    letterSpacing: "-0.03em",
    lineHeight: 1.15,
  },
  heroSerif40: serif(40),
  titleM: {
    ...sans(20, WEIGHT.medium, COLOR.primary),
    fontSize: "clamp(16px, 2.2vw, 20px)",
    letterSpacing: "-0.04em",
  },
  bodyL: {
    ...sans(18, WEIGHT.regular, COLOR.secondary),
    fontSize: "clamp(15px, 2vw, 18px)",
    letterSpacing: "-0.04em",
  },
  bodyM: sans(16, WEIGHT.regular, COLOR.secondary),
  bodyS: { ...sans(14, WEIGHT.regular, COLOR.secondary), letterSpacing: "-0.02em" },
  workCardTitle: {
    fontFamily: "'Inter', 'Inter Fallback', sans-serif",
    fontWeight: WEIGHT.semibold,
    fontSize: "clamp(20px, 2.2vw, 28px)",
    letterSpacing: "-0.04em",
    lineHeight: 1.2,
    margin: 0,
  },
  workCardDesc: {
    fontFamily: "'Inter', 'Inter Fallback', sans-serif",
    fontWeight: WEIGHT.regular,
    fontSize: "clamp(14px, 1.1vw, 16px)",
    letterSpacing: "-0.04em",
    lineHeight: 1.2,
    margin: 0,
  },
  wordleLetter: {
    fontFamily: "'Inter', 'Inter Fallback', sans-serif",
    fontWeight: WEIGHT.bold,
    fontSize: "clamp(36px, 12vw, 104px)",
    letterSpacing: "-0.05em",
    lineHeight: "normal",
    margin: 0,
  },
  caption: sans(13, WEIGHT.medium, COLOR.secondary),
  eyebrow: {
    fontFamily: "'Inter', 'Inter Fallback', sans-serif",
    fontWeight: WEIGHT.medium,
    fontSize: 12,
    letterSpacing: "0.2px",
    lineHeight: 1.2,
    margin: 0,
  },
  cursorBubble: sans(14, WEIGHT.medium, COLOR.inverse),
} satisfies Record<string, CSSProperties>;

export const merge = (a: CSSProperties, b: CSSProperties): CSSProperties => ({ ...a, ...b });
