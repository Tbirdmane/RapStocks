import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * SERVICE-ROLE client. Bypasses Row Level Security. The ONLY thing allowed to
 * mutate balances, holdings, shares_outstanding, and run settlements.
 *
 * `server-only` makes the build fail if this is ever imported into client
 * code, so the service key can never leak to the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
