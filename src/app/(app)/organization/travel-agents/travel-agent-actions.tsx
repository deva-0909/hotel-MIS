"use client";

import { useTransition } from "react";
import { toggleTravelAgentActive } from "@/app/actions/travel-agents";

export function TravelAgentActiveToggle({ agentId, isActive }: { agentId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleTravelAgentActive(agentId, !isActive))}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
