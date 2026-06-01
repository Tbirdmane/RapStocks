"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runSettlement } from "@/app/admin/actions";
import { formatCount, formatPrice } from "@/lib/format";

export type AdminArtist = {
  id: string;
  name: string;
  handle: string;
  basePrice: number;
  latestListeners: number | null;
};

export function SettlementForm({ artists }: { artists: AdminArtist[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setMessage(null);
    startTransition(async () => {
      const res = await runSettlement(formData);
      if (res.ok) {
        setMessage({ kind: "ok", text: `Settlement run for ${res.affected} artist(s).` });
        form.reset();
        router.refresh();
      } else {
        setMessage({ kind: "err", text: res.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <input
        name="notes"
        placeholder="Notes (optional) — e.g. 'May listener update'"
        className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
      />

      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-text-faint">
          <span className="flex-1">Artist</span>
          <span className="w-20 text-right">Base</span>
          <span className="w-28 text-right">New listeners</span>
        </div>
        <ul className="divide-y divide-border">
          {artists.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{a.name}</div>
                <div className="text-[11px] text-text-muted tnum">
                  now: {a.latestListeners != null ? formatCount(a.latestListeners) : "—"}
                </div>
              </div>
              <div className="w-20 text-right text-xs text-text-muted tnum">
                {formatPrice(a.basePrice)}
              </div>
              <input
                name={`listeners:${a.id}`}
                type="number"
                min={0}
                inputMode="numeric"
                placeholder={a.latestListeners != null ? String(a.latestListeners) : "—"}
                className="w-28 rounded-sm border border-border bg-bg px-2 py-1.5 text-right text-sm tnum outline-none focus:border-accent"
              />
            </li>
          ))}
        </ul>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-md bg-accent py-3.5 font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "Running settlement…" : "Run settlement"}
      </button>

      {message && (
        <p
          className={`mt-3 text-center text-sm font-semibold ${
            message.kind === "ok" ? "text-up" : "text-down"
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
