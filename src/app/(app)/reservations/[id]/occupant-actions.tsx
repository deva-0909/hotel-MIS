"use client";

import { useTransition } from "react";
import { removeOccupant } from "@/app/actions/occupants";

export function RemoveOccupantButton({ occupantId, reservationId }: { occupantId: string; reservationId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-xs text-gray-400 hover:text-red-600"
      onClick={() => startTransition(() => removeOccupant(occupantId, reservationId))}
    >
      Remove
    </button>
  );
}
