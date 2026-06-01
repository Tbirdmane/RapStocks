import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { spotPrice } from "@/lib/amm";
import { PageHeader, CoinPill } from "@/components/ui";
import { MarketList, type MarketArtist } from "@/components/MarketList";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.handle) redirect("/onboarding");

  const supabase = createClient();
  const { data: artists } = await supabase
    .from("artists")
    .select("id, name, handle, avatar_url, genre, base_price, k_coefficient, shares_outstanding, status")
    .order("shares_outstanding", { ascending: false });

  const rows: MarketArtist[] = (artists ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    handle: a.handle,
    avatarUrl: a.avatar_url,
    genre: a.genre,
    status: a.status,
    price: spotPrice({
      basePrice: Number(a.base_price),
      k: Number(a.k_coefficient),
      sharesOutstanding: a.shares_outstanding,
    }),
    sharesOutstanding: a.shares_outstanding,
  }));

  return (
    <>
      <PageHeader title="Market" right={<CoinPill balance={profile.coin_balance} />} />
      <MarketList artists={rows} />
    </>
  );
}
