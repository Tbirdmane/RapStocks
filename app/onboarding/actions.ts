"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export type HandleState = { error?: string };

/**
 * Sets the signed-in user's handle. Handles are lowercased, 3–20 chars,
 * a–z/0–9/underscore. Uniqueness is enforced by the DB unique constraint.
 * Runs under RLS as the user (they can only update their own profile, and the
 * balance guard blocks any balance change).
 */
export async function setHandle(
  _prev: HandleState,
  formData: FormData
): Promise<HandleState> {
  const raw = String(formData.get("handle") ?? "").trim().toLowerCase();
  if (!HANDLE_RE.test(raw)) {
    return { error: "3–20 characters: letters, numbers, underscore." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ handle: raw })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "That handle is taken." };
    return { error: error.message };
  }

  redirect("/market");
}
