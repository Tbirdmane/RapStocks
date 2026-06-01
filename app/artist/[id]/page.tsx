import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { spotPrice } from "@/lib/amm";
import { CURRENCY_NAME } from "@/lib/config";
import { formatPrice, formatCount, formatCoinsShort } from "@/lib/format";
import { Card, CoinPill } from "@/components/ui";
import { TradePanel } from "@/components/TradePanel";

export const dynamic = "force-dynamic";

export default async function ArtistPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.handle) redirect("/onboarding");

  const supabase = createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!artist) notFound();

  const { data: holding } = await supabase
    .from("holdings")
    .select("shares, avg_cost")
    .eq("artist_id", params.id)
    .eq("user_id", profile.id)
    .maybeSingle();

  const price = spotPrice({
    basePrice: Number(artist.base_price),
    k: Number(artist.k_coefficient),
    sharesOutstanding: artist.shares_outstanding,
  });

  const shares = holding?.shares ?? 0;
  const avgCost = Number(holding?.avg_cost ?? 0);
  const positionValue = shares * price;
  const costBasis = shares * avgCost;
  const plPct = costBasis > 0 ? (positionValue - costBasis) / costBasis : 0;

  return (
    <div className="px-4">
      <header className="flex items-center justify-between pb-2 pt-5">
        <Link href="/market" className="text-sm font-semibold text-text-muted">
          ← Market
        </Link>
        <CoinPill balance={profile.coin_balance} />
      </header>

      {/* Identity + live price */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-accent-soft text-lg font-bold text-accent">
          {artist.name.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold leading-tight">{artist.name}</h1>
          <div className="text-sm text-text-muted">
            @{artist.handle}
            {artist.genre ? ` · ${artist.genre}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tnum">{formatPrice(price)}</div>
          <div className="text-[11px] uppercase tracking-wide text-text-faint">
            {CURRENCY_NAME}/share
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Shares out" value={artist.shares_outstanding.toLocaleString()} />
        <Stat
          label="Monthly listeners"
          value={artist.latest_monthly_listeners ? formatCount(Number(artist.latest_monthly_listeners)) : "—"}
        />
        <Stat label="Base price" value={formatPrice(Number(artist.base_price))} />
      </div>

      {/* Current position */}
      {shares > 0 && (
        <Card className="mb-4 p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-faint">
            Your position
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="font-bold tnum">{shares.toLocaleString()}</div>
              <div className="text-[11px] text-text-muted">shares</div>
            </div>
            <div>
              <div className="font-bold tnum">{formatCoinsShort(positionValue)}</div>
              <div className="text-[11px] text-text-muted">value</div>
            </div>
            <div>
              <div className={`font-bold tnum ${plPct >= 0 ? "text-up" : "text-down"}`}>
                {plPct >= 0 ? "+" : ""}
                {(plPct * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-text-muted">P/L</div>
            </div>
          </div>
        </Card>
      )}

      {/* Price chart placeholder — wired up in step 7. */}
      <Card className="mb-4 flex h-28 items-center justify-center text-xs text-text-faint">
        Price chart coming next
      </Card>

      <TradePanel
        artistId={artist.id}
        spotPrice={price}
        balance={profile.coin_balance}
        sharesHeld={shares}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-2 text-center">
      <div className="text-sm font-bold tnum">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-text-faint">{label}</div>
    </Card>
  );
}
