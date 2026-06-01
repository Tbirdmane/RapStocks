import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on everything except static assets and the share-card image route.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|api/share-card).*)",
  ],
};
