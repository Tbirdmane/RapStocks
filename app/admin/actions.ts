"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, isAdminHandle } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETTLEMENT_SENSITIVITY, SETTLEMENT_MAX_MOVE } from "@/lib/config";

export type SettlementActionResult =
  | { ok: true; affected: number }
  | { ok: false; error: string };

/**
 * Runs a settlement from admin-entered listener numbers. Admin-gated by handle.
 * Entries with a blank listener field are skipped. All work happens atomically
 * in the run_settlement DB function via the service role.
 */
export async function runSettlement(
  formData: FormData
): Promise<SettlementActionResult> {
  const profile = await getCurrentProfile();
  if (!isAdminHandle(profile?.handle)) {
    return { ok: false, error: "Not authorized." };
  }

  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Collect listener inputs named "listeners:<artistId>".
  const entries: { artist_id: string; new_listeners: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("listeners:")) continue;
    const raw = String(value).trim();
    if (raw === "") continue;
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 0) continue;
    entries.push({ artist_id: key.slice("listeners:".length), new_listeners: n });
  }

  if (entries.length === 0) {
    return { ok: false, error: "Enter a listener number for at least one artist." };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("run_settlement", {
    p_notes: notes,
    p_entries: entries,
    p_sensitivity: SETTLEMENT_SENSITIVITY,
    p_max_move: SETTLEMENT_MAX_MOVE,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/market");
  return { ok: true, affected: entries.length };
}
