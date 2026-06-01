"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/market", label: "Market", icon: "📈" },
  { href: "/portfolio", label: "Portfolio", icon: "💼" },
  { href: "/leaderboard", label: "Ranks", icon: "🏆" },
  { href: "/friends", label: "Friends", icon: "👥" },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide the nav on auth screens.
  if (pathname?.startsWith("/login") || pathname === "/") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-screen-sm items-stretch justify-around">
        {items.map((it) => {
          const active = pathname?.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                active ? "text-accent" : "text-text-faint"
              }`}
            >
              <span className="text-lg leading-none">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
