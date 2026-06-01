"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptFriend, removeFriend } from "@/app/friends/actions";

/** Small client button for accept / remove friend actions. */
export function FriendActionButton({
  friendshipId,
  action,
  label,
  variant,
}: {
  friendshipId: string;
  action: "accept" | "remove";
  label: string;
  variant: "accent" | "ghost";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      if (action === "accept") await acceptFriend(friendshipId);
      else await removeFriend(friendshipId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`rounded-sm px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
        variant === "accent" ? "bg-accent text-white" : "border border-border text-text-muted"
      }`}
    >
      {pending ? "…" : label}
    </button>
  );
}
