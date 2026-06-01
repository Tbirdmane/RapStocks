import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { spotPrice } from "@/lib/amm";

/**
 * Portfolio valuation — shared by the portfolio page, leaderboard, friends, and
 * the share card. Always computed server-side (service role), never trusted to
 * the client. "Value" = cash + every holding marked at its current spot price.
 */

export type HoldingView = {
  artistId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  shares: number;
  avgCost: number;
  price: number;
  value: number; // shares * price
  costBasis: number; // shares * avgCost
  plAbs: number; // value - costBasis
  plPct: number; // plAbs / costBasis
};

export type PortfolioView = {
  cash: number;
  holdingsValue: number;
  totalValue: number;
  holdings: HoldingView[];
};

const BIG_WIN_PCT = 0.5; // a holding up 50%+ earns the "called it" badge

export async function getPortfolio(userId: string): Promise<PortfolioView> {
  const admin = createAdminClient();

  const [{ data: profile }, { data: rows }] = await Promise.all([
    admin.from("profiles").select("coin_balance").eq("id", userId).single(),
    admin
      .from("holdings")
      .select(
        "shares, avg_cost, artists(id, name, handle, avatar_url, base_price, k_coefficient, shares_outstanding)"
      )
      .eq("user_id", userId),
  ]);

  const cash = Number(profile?.coin_balance ?? 0);

  const holdings: HoldingView[] = (rows ?? [])
    .map((r) => {
      // Supabase types the embedded relation as an array; it's one row.
      const a = (Array.isArray(r.artists) ? r.artists[0] : r.artists) as
        | {
            id: string;
            name: string;
            handle: string;
            avatar_url: string | null;
            base_price: number;
            k_coefficient: number;
            shares_outstanding: number;
          }
        | undefined;
      if (!a) return null;
      const price = spotPrice({
        basePrice: Number(a.base_price),
        k: Number(a.k_coefficient),
        sharesOutstanding: a.shares_outstanding,
      });
      const shares = r.shares;
      const avgCost = Number(r.avg_cost);
      const value = shares * price;
      const costBasis = shares * avgCost;
      const plAbs = value - costBasis;
      return {
        artistId: a.id,
        name: a.name,
        handle: a.handle,
        avatarUrl: a.avatar_url,
        shares,
        avgCost,
        price,
        value,
        costBasis,
        plAbs,
        plPct: costBasis > 0 ? plAbs / costBasis : 0,
      };
    })
    .filter((h): h is HoldingView => h !== null)
    .sort((a, b) => b.value - a.value);

  const holdingsValue = holdings.reduce((s, h) => s + h.value, 0);

  return { cash, holdingsValue, totalValue: cash + holdingsValue, holdings };
}

/** The single best holding, for the share card. */
export function topHolding(p: PortfolioView): HoldingView | null {
  return p.holdings[0] ?? null;
}

/** "Called it" if any holding is up big. */
export function hasCalledIt(p: PortfolioView): boolean {
  return p.holdings.some((h) => h.plPct >= BIG_WIN_PCT);
}

/**
 * Weekly change: compares current total to the snapshot nearest ~7 days ago.
 * Falls back to the earliest snapshot if there isn't a week of history yet.
 */
export async function getWeeklyChange(
  userId: string,
  currentTotal: number
): Promise<{ pct: number; hasBaseline: boolean }> {
  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: prior } = await admin
    .from("portfolio_snapshots")
    .select("total_value")
    .eq("user_id", userId)
    .lte("captured_at", weekAgo)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let baseline = prior?.total_value;

  if (baseline == null) {
    const { data: earliest } = await admin
      .from("portfolio_snapshots")
      .select("total_value")
      .eq("user_id", userId)
      .order("captured_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    baseline = earliest?.total_value;
  }

  if (baseline == null || Number(baseline) === 0) {
    return { pct: 0, hasBaseline: false };
  }
  return {
    pct: (currentTotal - Number(baseline)) / Number(baseline),
    hasBaseline: true,
  };
}

/**
 * Records at most one portfolio snapshot per user per calendar day. Called when
 * a user views their portfolio so weekly-change baselines accumulate over time.
 */
export async function recordDailySnapshot(
  userId: string,
  totalValue: number
): Promise<void> {
  const admin = createAdminClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: today } = await admin
    .from("portfolio_snapshots")
    .select("id")
    .eq("user_id", userId)
    .gte("captured_at", startOfDay.toISOString())
    .limit(1)
    .maybeSingle();

  if (!today) {
    await admin
      .from("portfolio_snapshots")
      .insert({ user_id: userId, total_value: totalValue });
  }
}
