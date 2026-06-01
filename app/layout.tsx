import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/config";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME} — draft the next big rapper before they blow up.`,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: APP_NAME },
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
