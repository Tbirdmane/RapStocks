# BUILD_NOTES

Running log of decisions, simplest-option-that-ships choices, and open
questions. v1 scope only — nothing here adds features beyond the spec.

## Build progress
- [x] **Step 1** — Next.js (App Router, TS) + Tailwind + Supabase clients +
      env setup + design tokens + config constants.
- [x] **Step 2** — SQL migration: all tables + RLS (`0001_init.sql`). Trade
      engine function (`0002_trade_fn.sql`).
- [x] **Step 3** — Auth: magic-link + Google. Profile auto-created on signup via
      DB trigger; first login prompts for a handle.
- [x] **Step 4** — `/lib/amm` pricing module, 9 passing unit tests.
- [x] **Step 5** — Server-side trade action (`app/market/actions.ts`) +
      atomic `apply_trade` DB function.
- [x] **Step 6** — Market list (search) + artist detail + buy/sell UI.
      **>>> PAUSED HERE for you to confirm trading works end-to-end.**
- [ ] Step 7 — Portfolio page + P/L + price-history chart.
- [ ] Step 8 — Admin screen + settlement logic.
- [ ] Step 9 — Friends + leaderboard + you-vs-friends weekly.
- [ ] Step 10 — Share-card OG image route + button.
- [ ] Step 11 — PWA manifest + icons + mobile polish.

## Decisions (simplest option that ships)
- **Atomicity:** trades apply through a Postgres function (`apply_trade`) so
  balance + holding + shares_outstanding + transaction + price_history all
  commit in one transaction. The *math* stays in the unit-tested TS module
  (`/lib/amm`); the function applies the already-computed numbers and uses an
  optimistic `shares_outstanding` check (with one retry) to stay correct under
  concurrent trades. This honors both "math is tested TS" and "writes are
  atomic."
- **avg_cost / cost basis:** includes the 2% fee actually paid (total debit ÷
  shares). P/L compares position value at spot vs. this basis. Simple + honest.
- **Profiles are world-readable** (RLS `select using (true)`). Needed for the
  leaderboard and friend handles; coins are virtual so balance isn't sensitive.
  A trigger blocks non-service-role roles from editing their own `coin_balance`.
- **Leaderboard / friend portfolios** will be computed **server-side with the
  service role** (step 9) rather than opening up `holdings` reads to everyone.
  Keeps RLS tight: users can only read their own holdings/transactions.
- **Quote preview** in the buy/sell panel is fetched from a read-only server
  action (`getQuote`) — the client never computes price, per the guardrail.
- **Admin gate:** by handle via `ADMIN_HANDLES` env var (comma-separated). No
  separate roles table in v1.
- **Charts:** placeholder on the artist page for now; lightweight chart lib
  picked in step 7 (leaning toward a tiny dependency-free SVG sparkline to stay
  on free tiers and keep bundle small — will confirm in step 7).
- **Money display:** Clout shown as whole numbers (no decimals); per-share
  price shown with 2 decimals.

## Open questions for you
1. **Handle rules:** I used 3–20 chars, lowercase letters/numbers/underscore.
   OK, or do you want capitals / different length?
2. **K coefficient per artist:** seed uses the default `K = 0.5` for everyone
   but varies `base_price`. Want some artists "twitchier" (higher K) than
   others, or keep K uniform for v1?
3. **Sell of entire position:** selling all shares deletes the holding row (so
   avg_cost resets if they re-buy). That's the standard behavior; flagging in
   case you wanted to keep a zeroed row for history. (Transactions log keeps the
   full history regardless.)

## Things intentionally NOT built (per guardrails)
- No payments / Stripe / crypto / wallet.
- No external data APIs (TikTok/YouTube/etc.) — admin-entered listeners only,
  but the metric source is structured to be pluggable later.
- No order book / peer-to-peer trading.
- No native app / app-store packaging.
- No private custom leagues (that's v1.1).
