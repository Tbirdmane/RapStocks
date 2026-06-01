/**
 * AUTOMATED MARKET MAKER — linear bonding curve.
 *
 * Players trade AGAINST THE HOUSE. There is no order book and no peer-to-peer
 * matching: the house always quotes a price from the curve, so there is always
 * liquidity.
 *
 * This module is PURE math (no I/O). It is the only place price is computed.
 * It runs server-side only — the client never imports this to compute a price
 * or mutate a balance.
 *
 * Curve, for an artist with shares_outstanding S:
 *   spot price        p(S) = BASE_PRICE + K * S
 *   buy q shares      gross = BASE_PRICE*q + K*(q*S + q*q/2)    then S += q
 *   sell q shares     gross = BASE_PRICE*q + K*(q*S - q*q/2)    then S -= q
 *
 * (The buy/sell gross is the integral of the linear curve over [S, S+q] /
 * [S-q, S]. The +q*q/2 / -q*q/2 term is the average-price adjustment across
 * the q shares you move through.)
 */

import { FEE_RATE } from "@/lib/config";

export type CurveParams = {
  basePrice: number;
  k: number;
  sharesOutstanding: number;
};

export type Quote = {
  shares: number;
  /** Cost (buy) or proceeds (sell) before fee. */
  gross: number;
  /** House fee on the gross. */
  fee: number;
  /** What the user's balance is debited (buy) or credited (sell). */
  total: number;
  /** gross / shares — the effective blended price per share for this trade. */
  pricePerShare: number;
  /** shares_outstanding after the trade settles. */
  sharesOutstandingAfter: number;
};

/** Current spot (marginal) price for one more share. */
export function spotPrice(params: CurveParams): number {
  return params.basePrice + params.k * params.sharesOutstanding;
}

function assertValidQty(q: number): void {
  if (!Number.isInteger(q) || q <= 0) {
    throw new Error("Share quantity must be a positive integer.");
  }
}

/** Quote a BUY of q shares. Pure — does not mutate anything. */
export function quoteBuy(params: CurveParams, q: number, feeRate = FEE_RATE): Quote {
  assertValidQty(q);
  const { basePrice, k, sharesOutstanding: S } = params;
  const gross = basePrice * q + k * (q * S + (q * q) / 2);
  const fee = gross * feeRate;
  const total = gross + fee;
  return {
    shares: q,
    gross,
    fee,
    total, // debit
    pricePerShare: gross / q,
    sharesOutstandingAfter: S + q,
  };
}

/** Quote a SELL of q shares. Pure — does not mutate anything. */
export function quoteSell(params: CurveParams, q: number, feeRate = FEE_RATE): Quote {
  assertValidQty(q);
  const { basePrice, k, sharesOutstanding: S } = params;
  if (q > S) {
    throw new Error("Cannot sell more shares than are outstanding.");
  }
  const gross = basePrice * q + k * (q * S - (q * q) / 2);
  const fee = gross * feeRate;
  const total = gross - fee;
  return {
    shares: q,
    gross,
    fee,
    total, // credit
    pricePerShare: gross / q,
    sharesOutstandingAfter: S - q,
  };
}
