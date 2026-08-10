"use client";

import { useTransition } from "react";
import { toggleRatePlanActive } from "@/app/actions/rate-plans";

export function RatePlanActiveToggle({ ratePlanId, isActive }: { ratePlanId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleRatePlanActive(ratePlanId, !isActive))}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
