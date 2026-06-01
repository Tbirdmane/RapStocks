/**
 * Seed script — inserts emerging-rapper "stocks".
 *
 * Run with:  npm run seed
 * (Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local)
 *
 * Safe to re-run: upserts by handle, so existing artists are updated in place
 * and shares_outstanding is NOT touched (we only set it on first insert).
 *
 * NOTE: These 12 rows are PLACEHOLDER examples ("Artist 01", made-up numbers).
 * Replace them — and paste your real roster into REAL_ARTISTS below — with the
 * actual emerging artists and their starting monthly-listener counts. We do not
 * invent real artists or real streaming stats.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_BASE_PRICE, DEFAULT_K } from "../lib/config";

config({ path: ".env.local" });

type SeedArtist = {
  name: string;
  handle: string; // unique, lowercase, used as the upsert key
  genre?: string;
  base_price?: number; // defaults to DEFAULT_BASE_PRICE
  k_coefficient?: number; // defaults to DEFAULT_K
  latest_monthly_listeners?: number;
  status?: "active" | "prerelease";
};

// ── 12 EXAMPLE ROWS (placeholders — replace these) ──────────────────────────
const EXAMPLE_ARTISTS: SeedArtist[] = [
  { name: "Artist 01", handle: "artist01", genre: "Trap", base_price: 100, latest_monthly_listeners: 42000 },
  { name: "Artist 02", handle: "artist02", genre: "Drill", base_price: 120, latest_monthly_listeners: 88000 },
  { name: "Artist 03", handle: "artist03", genre: "Boom Bap", base_price: 90, latest_monthly_listeners: 15000 },
  { name: "Artist 04", handle: "artist04", genre: "Cloud Rap", base_price: 110, latest_monthly_listeners: 51000 },
  { name: "Artist 05", handle: "artist05", genre: "Trap", base_price: 140, latest_monthly_listeners: 130000 },
  { name: "Artist 06", handle: "artist06", genre: "Hyphy", base_price: 100, latest_monthly_listeners: 33000 },
  { name: "Artist 07", handle: "artist07", genre: "Drill", base_price: 95, latest_monthly_listeners: 21000 },
  { name: "Artist 08", handle: "artist08", genre: "Melodic", base_price: 160, latest_monthly_listeners: 210000 },
  { name: "Artist 09", handle: "artist09", genre: "Trap", base_price: 105, latest_monthly_listeners: 47000 },
  { name: "Artist 10", handle: "artist10", genre: "Experimental", base_price: 85, latest_monthly_listeners: 9000, status: "prerelease" },
  { name: "Artist 11", handle: "artist11", genre: "Boom Bap", base_price: 115, latest_monthly_listeners: 62000 },
  { name: "Artist 12", handle: "artist12", genre: "Melodic", base_price: 100, latest_monthly_listeners: 38000 },
];

// ── PASTE YOUR REAL ARTISTS HERE ────────────────────────────────────────────
// Fill this array with the ~100 real emerging artists you want in the game.
// Each needs at minimum: name, handle (unique), and a starting
// latest_monthly_listeners. Everything else falls back to the defaults.
// Example shape:
//   { name: "Real Rapper", handle: "realrapper", genre: "Drill",
//     latest_monthly_listeners: 73000 },
const REAL_ARTISTS: SeedArtist[] = [
  // <-- add real artists here
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const all = [...EXAMPLE_ARTISTS, ...REAL_ARTISTS];
  const rows = all.map((a) => ({
    name: a.name,
    handle: a.handle.toLowerCase(),
    genre: a.genre ?? null,
    base_price: a.base_price ?? DEFAULT_BASE_PRICE,
    k_coefficient: a.k_coefficient ?? DEFAULT_K,
    latest_monthly_listeners: a.latest_monthly_listeners ?? null,
    status: a.status ?? "active",
    // shares_outstanding intentionally omitted: keeps existing value on
    // re-run, and defaults to 0 on first insert.
  }));

  const { error, count } = await supabase
    .from("artists")
    .upsert(rows, { onConflict: "handle", ignoreDuplicates: false, count: "exact" });

  if (error) throw error;
  console.log(`✅ Seeded/updated ${count ?? rows.length} artists.`);
}

main().catch((e) => {
  console.error("Seed failed:", e.message ?? e);
  process.exit(1);
});
