"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    const supabase = createClient();
    startTransition(async () => {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      onClick={signOut}
      disabled={pending}
      className="text-sm font-semibold text-text-muted disabled:opacity-50"
    >
      {pending ? "…" : "Sign out"}
    </button>
  );
}
