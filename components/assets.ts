/** Shared vertical offset helper: positions relative to the vertical centre of the hero canvas. */
export const fromCenter = (px: number) => `calc(50% + ${px}px)`;

/** Hero/works handoff offset (px of window scroll that counts as "revealed"). */
export const REVEAL_OFFSET = 2;
