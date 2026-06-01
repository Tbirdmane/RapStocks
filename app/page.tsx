import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

// Entry point: route the player to the right place based on auth + onboarding.
export default async function Home() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.handle) redirect("/onboarding");
  redirect("/market");
}
