import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/config";
import { BottomNav } from "@/components/BottomNav";

// Used so icons/manifest/OG links resolve to absolute URLs on your real
// domain. Set NEXT_PUBLIC_SITE_URL in Vercel; falls back to localhost in dev.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: APP_NAME,
  description: `${APP_NAME} — draft the next big rapper before they blow up.`,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: APP_NAME },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0E14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        {/* Mobile-first: content column with room for the bottom nav. */}
        <div className="mx-auto w-full max-w-screen-sm pb-24">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
