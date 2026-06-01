import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { spotPrice } from "@/lib/amm";

/**
 * Social/ranking reads — leaderboard and friend valuations. Computed
 * server-side with the service role so we never have to open up other users'
 * holdings to the client (RLS keeps holdings owner-only).
 */

export type RankRow = {
  userId: string;
  handle: string;
  displayName: string | null;
  totalValue: number;
  rank: number;
};

/**
 * Total portfolio value for every player, ranked desc. Three queries total
 * (profiles, holdings, artists) — fine for the free tier / v1 scale.
 */
export async function getRankings(): Promise<RankRow[]> {
  const admin = createAdminClient();

  const [{ data: profiles }, { data: holdings }, { data: artists }] = await Promise.all([
    admin.from("profiles").select("id, handle, display_name, coin_balance").not("handle", "is", null),
    admin.from("holdings").select("user_id, artist_id, shares"),
    admin.from("artists").select("id, base_price, k_coefficient, shares_outstanding"),
  ]);

  // Spot price per artist.
  const priceById = new Map<string, number>();
  for (const a of artists ?? []) {
    priceById.set(
      a.id,
      spotPrice({
        basePrice: Number(a.base_price),
        k: Number(a.k_coefficient),
        sharesOutstanding: a.shares_outstanding,
      })
    );
  }

  // Holdings value per user.
  const holdingsValue = new Map<string, number>();
  for (const h of holdings ?? []) {
    const price = priceById.get(h.artist_id) ?? 0;
    holdingsValue.set(h.user_id, (holdingsValue.get(h.user_id) ?? 0) + h.shares * price);
  }

  const rows = (profiles ?? []).map((p) => ({
    userId: p.id,
    handle: p.handle as string,
    displayName: p.display_name,
    totalValue: Number(p.coin_balance) + (holdingsValue.get(p.id) ?? 0),
  }));

  rows.sort((a, b) => b.totalValue - a.totalValue);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Accepted friend user-ids for a user (both directions). */
export async function getFriendIds(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("friendships")
    .select("user_id, friend_id")
    .eq("status", "accepted")
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  const ids = new Set<string>();
  for (const f of data ?? []) {
    ids.add(f.user_id === userId ? f.friend_id : f.user_id);
  }
  return [...ids];
}
