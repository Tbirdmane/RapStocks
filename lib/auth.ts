import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

/**
 * Returns the signed-in user's profile, or null if not signed in.
 * Reads through RLS (profiles are world-readable, but we scope to the user).
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data ?? null;
}

/** True if the given handle is in the ADMIN_HANDLES env allow-list. */
export function isAdminHandle(handle: string | null | undefined): boolean {
  if (!handle) return false;
  const allow = (process.env.ADMIN_HANDLES ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(handle.toLowerCase());
}
