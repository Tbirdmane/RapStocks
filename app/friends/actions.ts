"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type FriendActionResult = { ok: true; message: string } | { ok: false; error: string };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Send a friend request by handle. Auto-accepts if they already invited you. */
export async function addFriendByHandle(formData: FormData): Promise<FriendActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const handle = String(formData.get("handle") ?? "").trim().toLowerCase().replace(/^@/, "");
  if (!handle) return { ok: false, error: "Enter a handle." };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, handle")
    .eq("handle", handle)
    .maybeSingle();

  if (!target) return { ok: false, error: `No player @${handle}.` };
  if (target.id === user.id) return { ok: false, error: "You can't add yourself." };

  // Already connected either direction?
  const { data: existing } = await admin
    .from("friendships")
    .select("id, user_id, friend_id, status")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") return { ok: false, error: "Already friends." };
    // A pending request the OTHER way means we can accept it now.
    if (existing.friend_id === user.id) {
      await admin.from("friendships").update({ status: "accepted" }).eq("id", existing.id);
      revalidatePath("/friends");
      return { ok: true, message: `You and @${handle} are now friends.` };
    }
    return { ok: false, error: "Request already pending." };
  }

  // Insert as the signed-in user (RLS: user_id must equal auth.uid()).
  const supabase = createClient();
  const { error } = await supabase
    .from("friendships")
    .insert({ user_id: user.id, friend_id: target.id, status: "pending" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/friends");
  return { ok: true, message: `Request sent to @${handle}.` };
}

export async function acceptFriend(friendshipId: string): Promise<FriendActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const supabase = createClient();
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId)
    .eq("friend_id", user.id); // only the recipient can accept
  if (error) return { ok: false, error: error.message };

  revalidatePath("/friends");
  return { ok: true, message: "Friend added." };
}

export async function removeFriend(friendshipId: string): Promise<FriendActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const supabase = createClient();
  // RLS allows delete when the user is either side of the row.
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/friends");
  return { ok: true, message: "Removed." };
}
