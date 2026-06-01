import type { Config } from "tailwindcss";
import { colors, fonts, radius } from "./lib/design-tokens";

// Tailwind consumes the design tokens so utility classes stay in sync with
// the single tokens file. Reskin in lib/design-tokens.ts, not here.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: colors.bg,
        surface: colors.surface,
        "surface-alt": colors.surfaceAlt,
        border: colors.border,
        text: colors.text,
        "text-muted": colors.textMuted,
        "text-faint": colors.textFaint,
        accent: colors.accent,
        "accent-soft": colors.accentSoft,
        up: colors.up,
        "up-soft": colors.upSoft,
        down: colors.down,
        "down-soft": colors.downSoft,
        gold: colors.gold,
      },
      fontFamily: {
        sans: fonts.sans.split(","),
        mono: fonts.mono.split(","),
      },
      borderRadius: {
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        pill: radius.pill,
      },
    },
  },
  plugins: [],
};

export default config;
