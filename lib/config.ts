/**
 * APP CONFIG CONSTANTS — one file, easy to change.
 *
 * Game-balance and branding knobs live here. Pricing math in /lib/amm reads
 * these defaults; the DB stores per-artist base_price / k so individual
 * artists can diverge from the defaults over time.
 */

// Branding. APP_NAME is a placeholder — global-replace "APP_NAME" later.
export const APP_NAME = "APP_NAME";
export const CURRENCY_NAME = "Clout";

// Economy
export const STARTING_BALANCE = 50000;

// Bonding curve defaults (per-artist values are stored in the DB)
export const DEFAULT_BASE_PRICE = 100;
export const DEFAULT_K = 0.5;

// House fee taken on every trade (buy and sell)
export const FEE_RATE = 0.02;

// Settlement (earnings-day) tuning
export const SETTLEMENT_SENSITIVITY = 1.0; // how hard growth moves the curve
export const SETTLEMENT_MAX_MOVE = 0.25; // clamp: ±25% per settlement
