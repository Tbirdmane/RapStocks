/**
 * Display formatting helpers. Pure, used on client and server.
 */

import { CURRENCY_NAME } from "@/lib/config";

/** Whole-coin currency, e.g. "12,540 Clout". Coins are virtual; no decimals shown. */
export function formatCoins(n: number): string {
  const rounded = Math.round(n);
  return `${rounded.toLocaleString("en-US")} ${CURRENCY_NAME}`;
}

/** Compact coins without the currency word, e.g. "12,540". */
export function formatCoinsShort(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Price per share, shown with 2 decimals, e.g. "104.25". */
export function formatPrice(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Signed percent, e.g. "+12.4%" / "-3.1%". */
export function formatPct(fraction: number): string {
  const pct = fraction * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** Big-number compaction for listener counts, e.g. "1.2M", "45.0K". */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

/** Tailwind text color class for a directional number. */
export function moveColor(delta: number): string {
  if (delta > 0) return "text-up";
  if (delta < 0) return "text-down";
  return "text-text-muted";
}
