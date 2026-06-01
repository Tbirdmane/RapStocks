"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { quoteBuy, quoteSell, spotPrice } from "@/lib/amm";

export type TradeResult = { ok: true; newBalance: number } | { ok: false; error: string };

export type QuotePreview =
  | { ok: true; gross: number; fee: number; total: number; pricePerShare: number }
  | { ok: false; error: string };

/**
 * Read-only price quote for the buy/sell preview. Computed server-side with
 * /lib/amm so the client never derives a price itself.
 */
export async function getQuote(
  artistId: string,
  type: "buy" | "sell",
  shares: number
): Promise<QuotePreview> {
  if (!Number.isInteger(shares) || shares <= 0) {
    return { ok: false, error: "Enter a whole number of shares." };
  }
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("base_price, k_coefficient, shares_outstanding")
    .eq("id", artistId)
    .single();
  if (!artist) return { ok: false, error: "Artist not found." };

  const params = {
    basePrice: Number(artist.base_price),
    k: Number(artist.k_coefficient),
    sharesOutstanding: artist.shares_outstanding,
  };
  try {
    const q = type === "buy" ? quoteBuy(params, shares) : quoteSell(params, shares);
    return {
      ok: true,
      gross: q.gross,
      fee: q.fee,
      total: q.total,
      pricePerShare: q.pricePerShare,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const ERROR_COPY: Record<string, string> = {
  INSUFFICIENT_FUNDS: "Not enough Clout for this buy.",
  INSUFFICIENT_SHARES: "You don't hold that many shares.",
  STALE_PRICE: "Price just moved — try again.",
  ARTIST_NOT_FOUND: "Artist not found.",
  INVALID_QTY: "Enter a whole number of shares.",
};

/**
 * Execute a BUY or SELL of `shares` in `artistId` for the signed-in user.
 *
 * Math is computed here with the tested /lib/amm module; the writes are applied
 * atomically by the apply_trade DB function via the service role. The client
 * never computes price or touches a balance.
 */
export async function trade(
  artistId: string,
  type: "buy" | "sell",
  shares: number
): Promise<TradeResult> {
  if (!Number.isInteger(shares) || shares <= 0) {
    return { ok: false, error: ERROR_COPY.INVALID_QTY };
  }

  // Identify the user from their session (RLS-bound client).
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const admin = createAdminClient();

  // One optimistic retry covers the rare case where S moved between read and write.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: artist, error: aErr } = await admin
      .from("artists")
      .select("id, base_price, k_coefficient, shares_outstanding")
      .eq("id", artistId)
      .single();
    if (aErr || !artist) return { ok: false, error: ERROR_COPY.ARTIST_NOT_FOUND };

    const params = {
      basePrice: Number(artist.base_price),
      k: Number(artist.k_coefficient),
      sharesOutstanding: artist.shares_outstanding,
    };

    let quote;
    try {
      quote = type === "buy" ? quoteBuy(params, shares) : quoteSell(params, shares);
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }

    const spotAfter = spotPrice({
      ...params,
      sharesOutstanding: quote.sharesOutstandingAfter,
    });

    const { data, error } = await admin.rpc("apply_trade", {
      p_user: user.id,
      p_artist: artistId,
      p_type: type,
      p_shares: shares,
      p_price_per_share: quote.pricePerShare,
      p_gross: quote.gross,
      p_fee: quote.fee,
      p_total: quote.total,
      p_expected_s: artist.shares_outstanding,
      p_new_s: quote.sharesOutstandingAfter,
      p_spot_after: spotAfter,
    });

    if (!error) {
      revalidatePath("/market");
      revalidatePath(`/artist/${artistId}`);
      revalidatePath("/portfolio");
      return { ok: true, newBalance: Number(data) };
    }

    const code = (error.message.match(/[A-Z_]{5,}/)?.[0] ?? "").trim();
    if (code === "STALE_PRICE" && attempt === 0) continue; // retry once
    return { ok: false, error: ERROR_COPY[code] ?? "Trade failed. Try again." };
  }

  return { ok: false, error: ERROR_COPY.STALE_PRICE };
}
