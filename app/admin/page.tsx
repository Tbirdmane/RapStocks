import { redirect } from "next/navigation";
import { getCurrentProfile, isAdminHandle } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETTLEMENT_MAX_MOVE } from "@/lib/config";
import { formatCount, formatPrice } from "@/lib/format";
import { PageHeader, Card } from "@/components/ui";
import { SettlementForm, type AdminArtist } from "@/components/SettlementForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isAdminHandle(profile.handle)) {
    return (
      <>
        <PageHeader title="Admin" />
        <div className="px-4 py-16 text-center text-sm text-text-muted">
          This area is restricted. Add your handle to <code>ADMIN_HANDLES</code> in your
          environment to access it.
        </div>
      </>
    );
  }

  const admin = createAdminClient();
  const { data: artists } = await admin
    .from("artists")
    .select("id, name, handle, base_price, latest_monthly_listeners")
    .order("name", { ascending: true });

  const rows: AdminArtist[] = (artists ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    handle: a.handle,
    basePrice: Number(a.base_price),
    latestListeners: a.latest_monthly_listeners ? Number(a.latest_monthly_listeners) : null,
  }));

  // Recent settlement history (auditable).
  const { data: settlements } = await admin
    .from("settlements")
    .select("id, run_at, notes")
    .order("run_at", { ascending: false })
    .limit(5);

  const { data: results } = await admin
    .from("settlement_results")
    .select("settlement_id, artist_id, prev_listeners, new_listeners, growth_pct, base_price_before, base_price_after")
    .order("settlement_id", { ascending: false });

  const nameById = new Map(rows.map((r) => [r.id, r.name]));

  return (
    <>
      <PageHeader title="Admin" />
      <div className="px-4">
        <p className="mb-4 text-sm text-text-muted">
          Enter each artist&apos;s latest monthly-listener count, then run a settlement to
          re-value the whole market. Curves shift by at most ±{SETTLEMENT_MAX_MOVE * 100}% per
          run. Blank fields are skipped.
        </p>

        <SettlementForm artists={rows} />

        {/* Settlement history */}
        {settlements && settlements.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text-faint">
              Recent settlements
            </h2>
            <div className="space-y-3">
              {settlements.map((s) => {
                const rs = (results ?? []).filter((r) => r.settlement_id === s.id);
                return (
                  <Card key={s.id} className="p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold">
                        {new Date(s.run_at).toLocaleString()}
                      </span>
                      {s.notes && (
                        <span className="text-xs text-text-muted">{s.notes}</span>
                      )}
                    </div>
                    <ul className="space-y-1 text-xs">
                      {rs.map((r, i) => {
                        const g = r.growth_pct == null ? null : Number(r.growth_pct);
                        const moved =
                          Number(r.base_price_after) - Number(r.base_price_before);
                        return (
                          <li key={i} className="flex items-center justify-between tnum">
                            <span className="text-text-muted">
                              {nameById.get(r.artist_id) ?? "—"}
                            </span>
                            <span className="flex items-center gap-2">
                              <span>
                                {r.prev_listeners ? formatCount(Number(r.prev_listeners)) : "—"} →{" "}
                                {formatCount(Number(r.new_listeners))}
                              </span>
                              <span className={moved >= 0 ? "text-up" : "text-down"}>
                                {g == null ? "new" : `${g >= 0 ? "+" : ""}${(g * 100).toFixed(0)}%`}{" "}
                                · {formatPrice(Number(r.base_price_before))}→
                                {formatPrice(Number(r.base_price_after))}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
