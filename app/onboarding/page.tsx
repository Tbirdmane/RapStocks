import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { CURRENCY_NAME, STARTING_BALANCE } from "@/lib/config";
import { formatCoinsShort } from "@/lib/format";
import { HandleForm } from "./HandleForm";

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.handle) redirect("/market");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-2 text-3xl font-black tracking-tight">Pick your handle</div>
        <p className="mb-6 text-sm text-text-muted">
          This is how friends find you and how you show up on the leaderboard.
        </p>
        <HandleForm />
        <p className="mt-6 text-xs text-text-faint">
          You start with{" "}
          <span className="font-bold text-accent">
            {formatCoinsShort(STARTING_BALANCE)} {CURRENCY_NAME}
          </span>{" "}
          to invest.
        </p>
      </div>
    </main>
  );
}
