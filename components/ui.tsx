import { CURRENCY_NAME } from "@/lib/config";
import { formatCoinsShort } from "@/lib/format";

/** Card surface. */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-border bg-surface ${className}`}>
      {children}
    </div>
  );
}

/** Page header with a title and optional right-side slot. */
export function PageHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between px-4 pb-2 pt-5">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {right}
    </header>
  );
}

/** Coin balance pill, used in headers. */
export function CoinPill({ balance }: { balance: number }) {
  return (
    <span className="rounded-pill bg-accent-soft px-3 py-1 text-sm font-bold text-accent tnum">
      {formatCoinsShort(balance)} {CURRENCY_NAME}
    </span>
  );
}

/** A loud directional number badge (green up / red down). */
export function DeltaBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-xs font-bold tnum ${
        up ? "bg-up-soft text-up" : "bg-down-soft text-down"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct * 100).toFixed(1)}%
    </span>
  );
}

/** Empty-state block. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-16 text-center text-sm text-text-muted">{children}</div>
  );
}
