import { describe, it, expect } from "vitest";
import { spotPrice, quoteBuy, quoteSell } from "./index";

// Defaults used across the spec: BASE_PRICE=100, K=0.5, FEE_RATE=0.02
const base = { basePrice: 100, k: 0.5 };

describe("spotPrice", () => {
  it("equals BASE_PRICE at zero shares outstanding", () => {
    expect(spotPrice({ ...base, sharesOutstanding: 0 })).toBe(100);
  });
  it("rises by K per outstanding share", () => {
    expect(spotPrice({ ...base, sharesOutstanding: 10 })).toBe(105);
  });
});

describe("quoteBuy", () => {
  it("prices the first share at base + half-slope (the integral over [0,1])", () => {
    // gross = 100*1 + 0.5*(1*0 + 1/2) = 100.25
    const q = quoteBuy({ ...base, sharesOutstanding: 0 }, 1, 0.02);
    expect(q.gross).toBeCloseTo(100.25, 6);
    expect(q.fee).toBeCloseTo(100.25 * 0.02, 6);
    expect(q.total).toBeCloseTo(100.25 * 1.02, 6);
    expect(q.sharesOutstandingAfter).toBe(1);
    expect(q.pricePerShare).toBeCloseTo(100.25, 6);
  });

  it("prices a 10-share buy from S=0 correctly", () => {
    // gross = 100*10 + 0.5*(10*0 + 100/2) = 1000 + 25 = 1025
    const q = quoteBuy({ ...base, sharesOutstanding: 0 }, 10, 0.02);
    expect(q.gross).toBeCloseTo(1025, 6);
    expect(q.fee).toBeCloseTo(20.5, 6);
    expect(q.total).toBeCloseTo(1045.5, 6);
    expect(q.sharesOutstandingAfter).toBe(10);
  });

  it("prices a buy when shares are already outstanding", () => {
    // S=100, q=5: gross = 100*5 + 0.5*(5*100 + 25/2) = 500 + 0.5*512.5 = 756.25
    const q = quoteBuy({ ...base, sharesOutstanding: 100 }, 5, 0.02);
    expect(q.gross).toBeCloseTo(756.25, 6);
    expect(q.sharesOutstandingAfter).toBe(105);
  });

  it("rejects non-positive and non-integer quantities", () => {
    expect(() => quoteBuy({ ...base, sharesOutstanding: 0 }, 0)).toThrow();
    expect(() => quoteBuy({ ...base, sharesOutstanding: 0 }, -3)).toThrow();
    expect(() => quoteBuy({ ...base, sharesOutstanding: 0 }, 1.5)).toThrow();
  });
});

describe("quoteSell", () => {
  it("prices a 10-share sell from S=10 (back down the curve)", () => {
    // S=10, q=10: gross = 100*10 + 0.5*(10*10 - 100/2) = 1000 + 0.5*50 = 1025
    const q = quoteSell({ ...base, sharesOutstanding: 10 }, 10, 0.02);
    expect(q.gross).toBeCloseTo(1025, 6);
    expect(q.fee).toBeCloseTo(20.5, 6);
    expect(q.total).toBeCloseTo(1004.5, 6); // proceeds minus fee
    expect(q.sharesOutstandingAfter).toBe(0);
  });

  it("buy then immediate sell of same q returns gross to the curve (fees are the only loss)", () => {
    const S = 40;
    const q = 7;
    const buy = quoteBuy({ ...base, sharesOutstanding: S }, q, 0.02);
    // After buying, S grew by q; selling the same q should give equal gross.
    const sell = quoteSell({ ...base, sharesOutstanding: S + q }, q, 0.02);
    expect(sell.gross).toBeCloseTo(buy.gross, 6);
    expect(sell.sharesOutstandingAfter).toBe(S);
    // Round-trip loss is exactly the two fees.
    const roundTripLoss = buy.total - sell.total;
    expect(roundTripLoss).toBeCloseTo(buy.fee + sell.fee, 6);
  });

  it("rejects selling more than outstanding", () => {
    expect(() => quoteSell({ ...base, sharesOutstanding: 5 }, 6)).toThrow();
  });
});
