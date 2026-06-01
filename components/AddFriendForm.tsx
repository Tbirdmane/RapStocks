"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addFriendByHandle } from "@/app/friends/actions";

export function AddFriendForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    startTransition(async () => {
      const res = await addFriendByHandle(fd);
      if (res.ok) {
        setMsg({ kind: "ok", text: res.message });
        formRef.current?.reset();
        router.refresh();
      } else {
        setMsg({ kind: "err", text: res.error });
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mb-5">
      <div className="flex gap-2">
        <div className="flex flex-1 items-center rounded-md border border-border bg-surface px-3 focus-within:border-accent">
          <span className="text-text-faint">@</span>
          <input
            name="handle"
            placeholder="friendhandle"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 font-bold text-white disabled:opacity-60"
        >
          {pending ? "…" : "Add"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-sm font-semibold ${msg.kind === "ok" ? "text-up" : "text-down"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
