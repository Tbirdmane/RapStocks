-- ============================================================================
--  RapStocks — initial schema + Row Level Security
--  Run this whole file once in the Supabase SQL Editor (see README).
--
--  SECURITY MODEL
--  • Row Level Security is ON for every table.
--  • The browser (anon key) and signed-in users can only do the few safe
--    things the policies below allow. They can NEVER set a price, a balance,
--    shares_outstanding, or write a trade/settlement.
--  • All money movement happens server-side with the service-role key, which
--    bypasses RLS. So writes to balances/holdings/transactions/settlements
--    have NO client policy at all — only the service role can do them.
-- ============================================================================

-- Enum types -----------------------------------------------------------------
do $$ begin
  create type artist_status as enum ('active', 'prerelease');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tx_type as enum ('buy', 'sell');
exception when duplicate_object then null; end $$;

do $$ begin
  create type friend_status as enum ('pending', 'accepted');
exception when duplicate_object then null; end $$;

-- ============================================================================
--  TABLES
-- ============================================================================

-- profiles: one row per auth user. coin_balance defaults to STARTING_BALANCE.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique,
  display_name  text,
  avatar_url    text,
  coin_balance  numeric not null default 50000,
  created_at    timestamptz not null default now()
);

-- artists: the tradeable "stocks". base_price/k define each artist's curve.
create table if not exists public.artists (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  handle                   text unique not null,
  avatar_url               text,
  genre                    text,
  base_price               numeric not null default 100,
  k_coefficient            numeric not null default 0.5,
  shares_outstanding       integer not null default 0,
  latest_monthly_listeners bigint,
  status                   artist_status not null default 'active',
  created_at               timestamptz not null default now()
);

-- holdings: a user's position in one artist.
create table if not exists public.holdings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  artist_id  uuid not null references public.artists(id) on delete cascade,
  shares     integer not null default 0,
  avg_cost   numeric not null default 0,
  unique (user_id, artist_id)
);

-- transactions: append-only trade log.
create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  artist_id       uuid not null references public.artists(id) on delete cascade,
  type            tx_type not null,
  shares          integer not null,
  price_per_share numeric not null,
  gross           numeric not null,
  fee             numeric not null,
  created_at      timestamptz not null default now()
);

-- listener_snapshots: admin-entered monthly listeners over time (pluggable
-- metric source — v1 only uses monthly listeners).
create table if not exists public.listener_snapshots (
  id                uuid primary key default gen_random_uuid(),
  artist_id         uuid not null references public.artists(id) on delete cascade,
  monthly_listeners bigint not null,
  captured_at       timestamptz not null default now()
);

-- settlements: one "earnings day" run.
create table if not exists public.settlements (
  id      uuid primary key default gen_random_uuid(),
  run_at  timestamptz not null default now(),
  notes   text
);

-- settlement_results: auditable per-artist before/after for each run.
create table if not exists public.settlement_results (
  id                uuid primary key default gen_random_uuid(),
  settlement_id     uuid not null references public.settlements(id) on delete cascade,
  artist_id         uuid not null references public.artists(id) on delete cascade,
  prev_listeners    bigint,
  new_listeners     bigint not null,
  growth_pct        numeric,
  base_price_before numeric not null,
  base_price_after  numeric not null
);

-- price_history: a row on every trade and every settlement, for charts.
create table if not exists public.price_history (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references public.artists(id) on delete cascade,
  price       numeric not null,
  captured_at timestamptz not null default now()
);

-- portfolio_snapshots: total value over time, for weekly change + share card.
create table if not exists public.portfolio_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  total_value numeric not null,
  captured_at timestamptz not null default now()
);

-- friendships: one row per request. Expose "accepted" in both directions in
-- app code.
create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  friend_id  uuid not null references public.profiles(id) on delete cascade,
  status     friend_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

-- Helpful indexes ------------------------------------------------------------
create index if not exists idx_holdings_user      on public.holdings(user_id);
create index if not exists idx_tx_user            on public.transactions(user_id, created_at desc);
create index if not exists idx_price_hist_artist  on public.price_history(artist_id, captured_at);
create index if not exists idx_psnap_user         on public.portfolio_snapshots(user_id, captured_at);
create index if not exists idx_friend_friend      on public.friendships(friend_id);

-- ============================================================================
--  AUTO-CREATE PROFILE ON SIGNUP
--  New auth user -> profile row with default coin_balance. handle stays NULL
--  until the player picks one (the app prompts for it on first login).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.artists             enable row level security;
alter table public.holdings            enable row level security;
alter table public.transactions        enable row level security;
alter table public.listener_snapshots  enable row level security;
alter table public.settlements         enable row level security;
alter table public.settlement_results  enable row level security;
alter table public.price_history       enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.friendships         enable row level security;

-- profiles -------------------------------------------------------------------
-- Public read (leaderboard + friend handles). Virtual coins, so balance is
-- not sensitive. Users may update only their own profile, and may NOT change
-- their own coin_balance (enforced in the policy's WITH CHECK via a guard
-- trigger below; the policy keeps row ownership).
drop policy if exists "profiles read all" on public.profiles;
create policy "profiles read all" on public.profiles
  for select using (true);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Guard: a normal user updating their own profile cannot move their balance.
-- (Service role bypasses RLS and this trigger because it is the table owner;
-- we only block the authenticated/anon roles.)
create or replace function public.prevent_balance_self_edit()
returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) <> 'service_role'
     and new.coin_balance is distinct from old.coin_balance then
    raise exception 'coin_balance can only be changed by the server';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_balance_guard on public.profiles;
create trigger trg_profiles_balance_guard
  before update on public.profiles
  for each row execute function public.prevent_balance_self_edit();

-- artists --------------------------------------------------------------------
-- Public read. No client writes (service role only).
drop policy if exists "artists read all" on public.artists;
create policy "artists read all" on public.artists
  for select using (true);

-- holdings -------------------------------------------------------------------
-- Owner reads own. No client writes (service role only). Friend portfolios and
-- the leaderboard are computed server-side with the service role.
drop policy if exists "holdings read own" on public.holdings;
create policy "holdings read own" on public.holdings
  for select using (auth.uid() = user_id);

-- transactions ---------------------------------------------------------------
-- Owner reads own. No client writes (service role only).
drop policy if exists "tx read own" on public.transactions;
create policy "tx read own" on public.transactions
  for select using (auth.uid() = user_id);

-- price_history --------------------------------------------------------------
-- Public read (charts). No client writes.
drop policy if exists "price_history read all" on public.price_history;
create policy "price_history read all" on public.price_history
  for select using (true);

-- settlements + results ------------------------------------------------------
-- Public read (price-spike history). No client writes.
drop policy if exists "settlements read all" on public.settlements;
create policy "settlements read all" on public.settlements
  for select using (true);

drop policy if exists "settlement_results read all" on public.settlement_results;
create policy "settlement_results read all" on public.settlement_results
  for select using (true);

-- listener_snapshots ---------------------------------------------------------
-- No client access at all (admin/service role only). RLS on with no policy =
-- denied for anon/authenticated.

-- portfolio_snapshots --------------------------------------------------------
-- Owner reads own. No client writes (service role only).
drop policy if exists "psnap read own" on public.portfolio_snapshots;
create policy "psnap read own" on public.portfolio_snapshots
  for select using (auth.uid() = user_id);

-- friendships ----------------------------------------------------------------
-- Read rows you are part of. Create requests as yourself. Accept requests sent
-- to you. Delete (unfriend / cancel) rows you are part of.
drop policy if exists "friend read involved" on public.friendships;
create policy "friend read involved" on public.friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "friend insert own" on public.friendships;
create policy "friend insert own" on public.friendships
  for insert with check (auth.uid() = user_id);

drop policy if exists "friend accept incoming" on public.friendships;
create policy "friend accept incoming" on public.friendships
  for update using (auth.uid() = friend_id or auth.uid() = user_id)
  with check (auth.uid() = friend_id or auth.uid() = user_id);

drop policy if exists "friend delete involved" on public.friendships;
create policy "friend delete involved" on public.friendships
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);
