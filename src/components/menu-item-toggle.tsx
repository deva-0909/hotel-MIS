"use client";

import { useTransition } from "react";
import { toggleMenuItemAvailability } from "@/app/actions/restaurant";

export function MenuItemToggle({ itemId, available }: { itemId: string; available: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleMenuItemAvailability(itemId, !available))}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        available ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {available ? "Available" : "86'd"}
    </button>
  );
}
