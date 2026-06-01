# APP_NAME

A web-first virtual stock-market game for discovering emerging rap/hip-hop
artists. Players spend **free virtual currency (Clout)** to buy and sell
"shares" in up-and-coming rappers, trading against an automated house market
maker. **No real money, ever.**

> `APP_NAME` is a placeholder. When you've picked the real name, global-replace
> the string `APP_NAME` across the repo (it lives in `lib/config.ts`,
> `public/manifest.webmanifest`, and a couple of UI strings).

---

## What you need (all free)

1. A **Supabase** account → https://supabase.com (free tier).
2. A **Vercel** account → https://vercel.com (free tier), for deploying later.
3. **Node.js 20+** installed on your computer to run it locally.

---

## Step-by-step setup (≈15 minutes)

### 1. Create your Supabase project
1. Go to supabase.com → **New project**. Pick any name and a strong database
   password (save it somewhere).
2. Wait ~2 minutes for it to finish provisioning.

### 2. Run the database migration
1. In Supabase, open **SQL Editor** (left sidebar) → **New query**.
2. Run the migration files in `supabase/migrations/` **in order**, one at a
   time — open each, copy ALL of it, paste into the editor, click **Run**:
   - `0001_init.sql` — every table + security (Row Level Security).
   - `0002_trade_fn.sql` — the atomic trade engine.
   - `0003_settlement_fn.sql` — the settlement ("earnings day") engine.

### 3. Grab your keys
1. In Supabase, go to **Project Settings → API**.
2. You need three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (this one is secret —
     never share it or put it in the browser)

### 4. Create your local env file
1. In the project folder, copy `.env.example` to a new file called
   `.env.local`.
2. Paste your three Supabase values in.
3. Set `ADMIN_HANDLES` to the handle you'll use as admin (you can fill this in
   after you pick your handle on first login), e.g. `ADMIN_HANDLES=tighe`.

### 5. Turn on login methods in Supabase
1. **Authentication → Providers**:
   - **Email** is on by default — that powers the magic link.
   - **Google**: toggle on and follow Supabase's instructions to paste a Google
     OAuth client ID/secret. (You can skip Google for now and just use email.)
2. **Authentication → URL Configuration**: set **Site URL** to
   `http://localhost:3000` for local dev (and your Vercel URL once deployed).

### 6. Install, seed, and run
```bash
npm install          # install dependencies (one time)
npm run seed         # load the 12 example artists into your database
npm run dev          # start the app
```
Open **http://localhost:3000**, sign in with your email magic link, pick a
handle, and you'll land in the Market with 50,000 Clout to trade.

---

## Filling in real artists
Open `scripts/seed.ts`. There are 12 placeholder artists ("Artist 01", etc.)
and a clearly-marked `REAL_ARTISTS` array. Paste your real roster into that
array (each needs a `name`, a unique `handle`, and a starting
`latest_monthly_listeners`), then run `npm run seed` again. Re-running is safe —
it updates existing artists by handle and never resets their share counts.

---

## Running the game day-to-day (you, the admin)
- Make sure your handle is listed in `ADMIN_HANDLES` (in `.env.local`, and in
  Vercel once deployed). Then an **Admin** link appears at the bottom of your
  Portfolio page.
- **Settlements ("earnings day"):** open **Admin**, type each artist's latest
  monthly-listener number, add an optional note, and hit **Run settlement**.
  Every artist's price curve shifts based on their growth (capped at ±25% per
  run), instantly re-valuing everyone's holdings. Each run is logged with
  before/after numbers so you can show the price-spike history later.
- **Share card:** players tap "Get my share card" on their Portfolio to open a
  ready-to-post 1080×1350 image of their stats. They save it and post to
  TikTok/Instagram.

## Useful commands
| Command | What it does |
|---|---|
| `npm run dev` | Run the app locally at localhost:3000 |
| `npm run seed` | Insert/update artists from `scripts/seed.ts` |
| `npm run test` | Run the pricing-math unit tests |
| `npm run build` | Production build (what Vercel runs) |
| `node scripts/generate-icons.mjs` | Regenerate the app/PWA icons (only if you reskin) |

---

## Deploying to Vercel (later)
See **`DEPLOY.md`** for a full, click-by-click walkthrough written for a
non-technical founder. The short version:
1. Merge your code into `main` on GitHub.
2. In Vercel: **New Project** → import the repo.
3. Add the same env vars from `.env.local` in Vercel's project settings.
4. Update Supabase **Site URL** + **Redirect URLs** to your Vercel domain.
5. Deploy.

---

## Ground rules baked into the app
- **No real money.** Virtual Clout only — no payments, no crypto, no wallet.
- **House market maker**, not peer-to-peer. The house always quotes a price.
- All prices and balances change **server-side only**. The browser can never
  set a price or a balance (enforced by Row Level Security + the service role).
- Listener numbers are **admin-entered**; no external APIs in v1.

See `BUILD_NOTES.md` for decisions made and open questions.
