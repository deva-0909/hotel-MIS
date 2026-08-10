"use client";

import { useTransition } from "react";
import { deleteRestriction } from "@/app/actions/restrictions";

export function DeleteRestrictionButton({ restrictionId }: { restrictionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deleteRestriction(restrictionId))}
      className="text-xs text-gray-400 hover:text-red-600"
    >
      Remove
    </button>
  );
}
