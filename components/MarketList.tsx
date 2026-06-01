"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { Empty } from "@/components/ui";

export type MarketArtist = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  genre: string | null;
  status: "active" | "prerelease";
  price: number;
  sharesOutstanding: number;
};

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-11 w-11 rounded-md object-cover" />;
  }
  const initials = name.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent-soft text-sm font-bold text-accent">
      {initials || "?"}
    </div>
  );
}

export function MarketList({ artists }: { artists: MarketArtist[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return artists;
    return artists.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.handle.toLowerCase().includes(needle) ||
        (a.genre ?? "").toLowerCase().includes(needle)
    );
  }, [q, artists]);

  return (
    <div className="px-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search artists, genres…"
        className="mb-3 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
      />

      {filtered.length === 0 ? (
        <Empty>No artists match “{q}”.</Empty>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
          {filtered.map((a) => (
            <li key={a.id}>
              <Link
                href={`/artist/${a.id}`}
                className="flex items-center gap-3 px-3 py-2.5 active:bg-surface-alt"
              >
                <Avatar name={a.name} url={a.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold">{a.name}</span>
                    {a.status === "prerelease" && (
                      <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">
                        Pre
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-text-muted">
                    @{a.handle}
                    {a.genre ? ` · ${a.genre}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold tnum">{formatPrice(a.price)}</div>
                  <div className="text-[11px] text-text-faint tnum">
                    {a.sharesOutstanding.toLocaleString()} shares
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
