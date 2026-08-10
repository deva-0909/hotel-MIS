"use client";

import { useTransition } from "react";
import { toggleCompanyActive } from "@/app/actions/companies";

export function CompanyActiveToggle({ companyId, isActive }: { companyId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleCompanyActive(companyId, !isActive))}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
