import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRankings } from "@/lib/social";
import { getWeeklyChange } from "@/lib/portfolio";
import { CURRENCY_NAME } from "@/lib/config";
import { formatCoinsShort } from "@/lib/format";
import { PageHeader, Card, DeltaBadge, Empty } from "@/components/ui";
import { AddFriendForm } from "@/components/AddFriendForm";
import { FriendActionButton } from "@/components/FriendActionButton";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.handle) redirect("/onboarding");

  const admin = createAdminClient();

  // Incoming pending requests (people who want to add me).
  const { data: incoming } = await admin
    .from("friendships")
    .select("id, user_id")
    .eq("friend_id", profile.id)
    .eq("status", "pending");

  const requesterIds = (incoming ?? []).map((r) => r.user_id);
  const { data: requesters } = requesterIds.length
    ? await admin.from("profiles").select("id, handle").in("id", requesterIds)
    : { data: [] as { id: string; handle: string | null }[] };
  const requesterHandle = new Map((requesters ?? []).map((r) => [r.id, r.handle]));

  // Accepted friendships (both directions). Keep the row id so we can unfriend.
  const { data: accepted } = await admin
    .from("friendships")
    .select("id, user_id, friend_id")
    .eq("status", "accepted")
    .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);

  const friendshipIdByUser = new Map<string, string>();
  for (const f of accepted ?? []) {
    const other = f.user_id === profile.id ? f.friend_id : f.user_id;
    friendshipIdByUser.set(other, f.id);
  }
  const circleIds = new Set([profile.id, ...friendshipIdByUser.keys()]);

  const allRanks = await getRankings();
  const circle = allRanks.filter((r) => circleIds.has(r.userId));
  // Re-rank within the circle and attach weekly change.
  const ranked = await Promise.all(
    circle
      .sort((a, b) => b.totalValue - a.totalValue)
      .map(async (r, i) => ({
        ...r,
        rank: i + 1,
        weekly: (await getWeeklyChange(r.userId, r.totalValue)).pct,
      }))
  );

  return (
    <>
      <PageHeader title="Friends" />
      <div className="px-4">
        <AddFriendForm />

        {/* Incoming requests */}
        {incoming && incoming.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text-faint">
              Requests
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
              {incoming.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex-1 font-bold">@{requesterHandle.get(r.user_id) ?? "player"}</span>
                  <FriendActionButton friendshipId={r.id} action="accept" label="Accept" variant="accent" />
                  <FriendActionButton friendshipId={r.id} action="remove" label="Decline" variant="ghost" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* You vs friends */}
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-text-faint">
          You vs friends · this week
        </h2>
        {ranked.length <= 1 ? (
          <Empty>Add a friend by handle to start a ranking.</Empty>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
            {ranked.map((r) => {
              const isMe = r.userId === profile.id;
              return (
                <li
                  key={r.userId}
                  className={`flex items-center gap-3 px-3 py-2.5 ${isMe ? "bg-accent-soft/40" : ""}`}
                >
                  <span className="w-6 text-center text-sm font-black tnum">{r.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">
                      @{r.handle}
                      {isMe && <span className="ml-1 text-xs text-accent">you</span>}
                    </div>
                    <div className="text-xs tnum text-text-muted">
                      {formatCoinsShort(r.totalValue)} {CURRENCY_NAME}
                    </div>
                  </div>
                  <DeltaBadge pct={r.weekly} />
                  {!isMe && friendshipIdByUser.has(r.userId) && (
                    <FriendActionButton
                      friendshipId={friendshipIdByUser.get(r.userId)!}
                      action="remove"
                      label="✕"
                      variant="ghost"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
