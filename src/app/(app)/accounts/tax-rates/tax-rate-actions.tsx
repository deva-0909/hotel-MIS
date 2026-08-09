"use client";

import { useTransition } from "react";
import { toggleTaxRateActive } from "@/app/actions/tax";

export function TaxRateActiveToggle({ taxRateId, isActive }: { taxRateId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleTaxRateActive(taxRateId, !isActive))}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
