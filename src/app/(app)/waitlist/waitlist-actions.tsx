"use client";

import { useTransition } from "react";
import { cancelWaitlistEntry } from "@/app/actions/waitlist";

export function CancelWaitlistButton({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => cancelWaitlistEntry(entryId))}
      className="text-xs text-gray-400 hover:text-red-600"
    >
      Remove
    </button>
  );
}
