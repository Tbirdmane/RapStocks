import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Email magic-link / signup confirmation via token_hash.
 *
 * Unlike the PKCE `code` flow (in /auth/callback), token_hash verification is
 * stateless — it doesn't need a secret stored in the requesting browser. That
 * makes it work when the email link opens in a different browser than the one
 * that requested it (the normal case on phones, where the mail app uses its
 * own in-app browser). This is what makes mobile sign-in reliable.
 *
 * Supabase email templates point here, e.g.:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
