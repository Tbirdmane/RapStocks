import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getRankings } from "@/lib/social";
import { CURRENCY_NAME } from "@/lib/config";
import { formatCoinsShort } from "@/lib/format";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}`;
}

export default async function LeaderboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.handle) redirect("/onboarding");

  const rows = await getRankings();

  return (
    <>
      <PageHeader title="Ranks" />
      <div className="px-4">
        <p className="mb-3 text-sm text-text-muted">
          Global leaderboard by total portfolio value (cash + holdings).
        </p>
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
          {rows.map((r) => {
            const isMe = r.userId === profile.id;
            return (
              <li
                key={r.userId}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  isMe ? "bg-accent-soft/40" : ""
                }`}
              >
                <span className="w-7 text-center text-sm font-black tnum">
                  {rankBadge(r.rank)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">
                    @{r.handle}
                    {isMe && <span className="ml-1 text-xs text-accent">you</span>}
                  </div>
                  {r.displayName && (
                    <div className="truncate text-xs text-text-muted">{r.displayName}</div>
                  )}
                </div>
                <div className="text-right font-bold tnum">
                  {formatCoinsShort(r.totalValue)}
                  <span className="ml-1 text-[11px] font-normal text-text-faint">
                    {CURRENCY_NAME}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
