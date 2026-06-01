/**
 * DESIGN TOKENS — single source of truth for the entire look.
 *
 * Reskin the whole app from this one file. Tailwind reads these values in
 * tailwind.config.ts, and the OG share card / inline styles import them too.
 *
 * Vibe: sports-app energy (Sleeper / DraftKings). Dark, bold, stat-heavy,
 * one punchy accent color. Price/P&L moves should be loud green/red.
 */

export const colors = {
  // Surfaces (dark theme)
  bg: "#0B0E14", // app background
  surface: "#141925", // cards
  surfaceAlt: "#1C2230", // raised / hover
  border: "#262E3F",

  // Text
  text: "#F5F7FA",
  textMuted: "#8A93A6",
  textFaint: "#5A6273",

  // Brand accent — the one punchy color. Reskin here.
  accent: "#7C5CFF", // electric violet
  accentSoft: "#2A2350",

  // Money / movement (loud)
  up: "#21D07A", // green — price up / profit
  upSoft: "#11331F",
  down: "#FF4D5E", // red — price down / loss
  downSoft: "#3A1620",

  // Misc
  gold: "#FFC83D", // "called it" badge, #1 leaderboard
} as const;

export const fonts = {
  // System stack keeps us fast + free (no font hosting). Swap to a brand
  // font here later and it propagates everywhere.
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  // Tabular numbers matter for stat columns lining up.
  mono: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace',
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  pill: "999px",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
} as const;
