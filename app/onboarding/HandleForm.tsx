"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setHandle, type HandleState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-accent py-3 font-bold text-white disabled:opacity-60"
    >
      {pending ? "Saving…" : "Claim handle"}
    </button>
  );
}

export function HandleForm() {
  const [state, formAction] = useFormState<HandleState, FormData>(setHandle, {});
  return (
    <form action={formAction} className="space-y-3">
      <div className="flex items-center rounded-md border border-border bg-surface px-3 focus-within:border-accent">
        <span className="text-text-faint">@</span>
        <input
          name="handle"
          required
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="yourhandle"
          className="w-full bg-transparent px-2 py-3 text-base outline-none"
        />
      </div>
      <SubmitButton />
      {state.error && <p className="text-sm text-down">{state.error}</p>}
    </form>
  );
}
