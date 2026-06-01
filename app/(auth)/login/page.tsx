"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/config";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-4xl font-black tracking-tight text-accent">
            {APP_NAME}
          </div>
          <p className="text-sm text-text-muted">
            Draft the next big rapper before they blow up.
          </p>
        </div>

        {sent ? (
          <div className="rounded-md border border-border bg-surface p-5 text-center">
            <div className="mb-1 text-lg font-bold">Check your email</div>
            <p className="text-sm text-text-muted">
              We sent a magic sign-in link to <span className="text-text">{email}</span>.
              Open it on this device to finish signing in.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={sendMagicLink} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-accent py-3 font-bold text-white disabled:opacity-60"
              >
                {loading ? "Sending…" : "Email me a magic link"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-text-faint">
              <div className="h-px flex-1 bg-border" />
              OR
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full rounded-md border border-border bg-surface py-3 font-bold"
            >
              Continue with Google
            </button>
          </>
        )}

        {error && <p className="mt-4 text-center text-sm text-down">{error}</p>}

        <p className="mt-8 text-center text-xs text-text-faint">
          Free virtual currency only. No real money, ever.
        </p>
      </div>
    </main>
  );
}
