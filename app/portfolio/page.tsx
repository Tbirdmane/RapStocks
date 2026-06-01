import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, isAdminHandle } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPortfolio,
  getWeeklyChange,
  recordDailySnapshot,
  hasCalledIt,
} from "@/lib/portfolio";
import { CURRENCY_NAME } from "@/lib/config";
import { formatCoinsShort, formatPrice } from "@/lib/format";
import { PageHeader, Card, DeltaBadge, Empty } from "@/components/ui";
import { LineChart } from "@/components/LineChart";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.handle) redirect("/onboarding");

  const p = await getPortfolio(profile.id);

  // Record today's snapshot, then read weekly change + history for the chart.
  await recordDailySnapshot(profile.id, p.totalValue);
  const weekly = await getWeeklyChange(profile.id, p.totalValue);

  const admin = createAdminClient();
  const { data: snaps } = await admin
    .from("portfolio_snapshots")
    .select("total_value, captured_at")
    .eq("user_id", profile.id)
    .order("captured_at", { ascending: true })
    .limit(60);

  const series = (snaps ?? []).map((s) => Number(s.total_value));
  const called = hasCalledIt(p);

  return (
    <>
      <PageHeader title="Portfolio" right={<SignOutButton />} />

      <div className="px-4">
        {/* Hero total value */}
        <Card className="mb-4 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-text-faint">
            Total value
          </div>
          <div className="mt-1 flex items-end gap-2">
            <div className="text-4xl font-black tnum">
              {formatCoinsShort(p.totalValue)}
            </div>
            <div className="pb-1 text-sm font-bold text-text-muted">{CURRENCY_NAME}</div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <DeltaBadge pct={weekly.pct} />
            <span className="text-xs text-text-muted">
              {weekly.hasBaseline ? "this week" : "building weekly history…"}
            </span>
            {called && (
              <span className="ml-auto rounded-pill bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
                🔥 Called it
              </span>
            )}
          </div>
          <div className="mt-3">
            <LineChart points={series} height={90} />
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-text-muted">Cash</span>
            <span className="tnum">{formatCoinsShort(p.cash)} {CURRENCY_NAME}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Holdings</span>
            <span className="tnum">{formatCoinsShort(p.holdingsValue)} {CURRENCY_NAME}</span>
          </div>
        </Card>

        {/* Share card button */}
        <a
          href="/api/share-card"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 block w-full rounded-md bg-accent py-3 text-center font-extrabold text-white"
        >
          📸 Get my share card
        </a>

        {/* Holdings */}
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-text-faint">
          Holdings ({p.holdings.length})
        </h2>

        {p.holdings.length === 0 ? (
          <Empty>
            You don&apos;t own any shares yet.{" "}
            <Link href="/market" className="font-bold text-accent">
              Hit the market →
            </Link>
          </Empty>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
            {p.holdings.map((h) => (
              <li key={h.artistId}>
                <Link
                  href={`/artist/${h.artistId}`}
                  className="flex items-center gap-3 px-3 py-2.5 active:bg-surface-alt"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{h.name}</div>
                    <div className="text-xs text-text-muted tnum">
                      {h.shares.toLocaleString()} @ {formatPrice(h.avgCost)} avg
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tnum">{formatCoinsShort(h.value)}</div>
                    <div
                      className={`text-xs font-bold tnum ${
                        h.plPct >= 0 ? "text-up" : "text-down"
                      }`}
                    >
                      {h.plPct >= 0 ? "+" : ""}
                      {(h.plPct * 100).toFixed(1)}%
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {isAdminHandle(profile.handle) && (
          <Link
            href="/admin"
            className="mt-6 block text-center text-sm font-semibold text-text-faint"
          >
            ⚙️ Admin · run settlement
          </Link>
        )}
      </div>
    </>
  );
}
