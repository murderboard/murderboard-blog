import type { CSSProperties } from "react";
import type { BoardTheme } from "./types";

// The default theme is the Murder Board house style (dark cork, red string,
// typewriter + Playfair via the app's next/font CSS vars). A series can override
// any subset in tools/series/<slug>.json under a "theme" key.
export const DEFAULT_THEME: BoardTheme = {
  palette: {
    bg: "#0d0b0b",
    surface:
      "linear-gradient(135deg, #1e1610, #161210, #1a1510)",
    red: "#ed1c2e",
    redDark: "#b8101f",
    pink: "#ff3d8b",
    yellow: "#ffd83d",
    cream: "#f0ece0",
    creamDim: "#c8c3b2",
    postitY: "#f5e642",
    postitR: "#e83232",
    postitW: "#f0ece0",
    postitPink: "#f5a0c0",
    clipping: "#e8e0cc",
    pin: "#ed1c2e",
    pinGold: "#c8942a",
    pinWhite: "#e8e4d8",
  },
  fonts: {
    display: "var(--font-display), Georgia, serif",
    typewriter: "var(--font-typewriter), ui-monospace, monospace",
  },
  card: {
    radius: "0px",
    shadow: "3px 5px 16px rgba(0,0,0,0.6)",
    attach: "pin",
  },
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function resolveTheme(override?: DeepPartial<BoardTheme> | null): BoardTheme {
  if (!override) return DEFAULT_THEME;
  return {
    palette: { ...DEFAULT_THEME.palette, ...(override.palette ?? {}) },
    fonts: { ...DEFAULT_THEME.fonts, ...(override.fonts ?? {}) },
    card: { ...DEFAULT_THEME.card, ...(override.card ?? {}) },
  };
}

// Flatten a theme into the CSS custom properties the component reads.
export function themeToCssVars(theme: BoardTheme): CSSProperties {
  const p = theme.palette;
  return {
    "--mb-bg": p.bg,
    "--mb-surface": p.surface,
    "--mb-red": p.red,
    "--mb-red-dark": p.redDark,
    "--mb-pink": p.pink,
    "--mb-yellow": p.yellow,
    "--mb-cream": p.cream,
    "--mb-cream-dim": p.creamDim,
    "--mb-postit-y": p.postitY,
    "--mb-postit-r": p.postitR,
    "--mb-postit-w": p.postitW,
    "--mb-postit-pink": p.postitPink,
    "--mb-clipping": p.clipping,
    "--mb-pin": p.pin,
    "--mb-pin-gold": p.pinGold,
    "--mb-pin-white": p.pinWhite,
    "--mb-font-display": theme.fonts.display,
    "--mb-font-typewriter": theme.fonts.typewriter,
    "--mb-card-radius": theme.card.radius,
    "--mb-card-shadow": theme.card.shadow,
  } as CSSProperties;
}
