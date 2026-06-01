"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trade, getQuote, type QuotePreview } from "@/app/market/actions";
import { CURRENCY_NAME } from "@/lib/config";
import { formatCoinsShort, formatPrice } from "@/lib/format";

export function TradePanel({
  artistId,
  spotPrice,
  balance,
  sharesHeld,
}: {
  artistId: string;
  spotPrice: number;
  balance: number;
  sharesHeld: number;
}) {
  const router = useRouter();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState(1);
  const [quote, setQuote] = useState<QuotePreview | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Fetch a server-side quote whenever side/qty changes (debounced).
  useEffect(() => {
    let cancelled = false;
    if (!Number.isInteger(qty) || qty <= 0) {
      setQuote(null);
      return;
    }
    const t = setTimeout(async () => {
      const q = await getQuote(artistId, side, qty);
      if (!cancelled) setQuote(q);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [artistId, side, qty]);

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const res = await trade(artistId, side, qty);
      if (res.ok) {
        setMessage({ kind: "ok", text: `${side === "buy" ? "Bought" : "Sold"} ${qty} share${qty > 1 ? "s" : ""}.` });
        router.refresh();
      } else {
        setMessage({ kind: "err", text: res.error });
      }
    });
  }

  const maxSell = sharesHeld;
  const disabled =
    pending ||
    qty <= 0 ||
    (side === "sell" && (maxSell === 0 || qty > maxSell)) ||
    (side === "buy" && quote?.ok === true && quote.total > balance);

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      {/* Buy / Sell toggle */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-bg p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSide(s);
              setMessage(null);
            }}
            className={`rounded-sm py-2 text-sm font-bold uppercase tracking-wide ${
              side === s
                ? s === "buy"
                  ? "bg-up text-black"
                  : "bg-down text-black"
                : "text-text-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Quantity stepper */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="h-11 w-11 rounded-md border border-border text-xl font-bold"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          className="h-11 w-full rounded-md border border-border bg-bg text-center text-lg font-bold tnum outline-none focus:border-accent"
        />
        <button
          onClick={() => setQty((q) => q + 1)}
          className="h-11 w-11 rounded-md border border-border text-xl font-bold"
        >
          +
        </button>
      </div>

      {side === "sell" && (
        <div className="mb-3 flex gap-1">
          {[0.25, 0.5, 1].map((f) => (
            <button
              key={f}
              disabled={maxSell === 0}
              onClick={() => setQty(Math.max(1, Math.floor(maxSell * f)))}
              className="flex-1 rounded-sm border border-border py-1.5 text-xs font-bold text-text-muted disabled:opacity-40"
            >
              {f === 1 ? "MAX" : `${f * 100}%`}
            </button>
          ))}
        </div>
      )}

      {/* Quote breakdown */}
      <div className="mb-3 space-y-1 text-sm">
        <Row label="Spot price" value={`${formatPrice(spotPrice)} ${CURRENCY_NAME}`} />
        {quote?.ok && (
          <>
            <Row label="Blended price/share" value={formatPrice(quote.pricePerShare)} />
            <Row label={side === "buy" ? "Cost" : "Proceeds"} value={formatCoinsShort(quote.gross)} />
            <Row label="Fee (2%)" value={formatCoinsShort(quote.fee)} />
            <div className="my-1 h-px bg-border" />
            <Row
              label={side === "buy" ? "Total debit" : "Total credit"}
              value={`${formatCoinsShort(quote.total)} ${CURRENCY_NAME}`}
              bold
            />
          </>
        )}
        {quote && !quote.ok && <p className="text-xs text-down">{quote.error}</p>}
      </div>

      <button
        onClick={submit}
        disabled={disabled}
        className={`w-full rounded-md py-3.5 text-base font-extrabold uppercase tracking-wide text-black disabled:opacity-40 ${
          side === "buy" ? "bg-up" : "bg-down"
        }`}
      >
        {pending ? "Working…" : `${side} ${qty || ""} share${qty === 1 ? "" : "s"}`}
      </button>

      <div className="mt-2 text-center text-xs text-text-faint tnum">
        {side === "buy"
          ? `Balance: ${formatCoinsShort(balance)} ${CURRENCY_NAME}`
          : `You hold ${sharesHeld.toLocaleString()} shares`}
      </div>

      {message && (
        <p
          className={`mt-2 text-center text-sm font-semibold ${
            message.kind === "ok" ? "text-up" : "text-down"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className={`tnum ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}
