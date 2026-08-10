"use client";

import { useTransition } from "react";
import { toggleStoreActive } from "@/app/actions/stores";

export function StoreActiveToggle({ storeId, isActive, isDefault }: { storeId: string; isActive: boolean; isDefault: boolean }) {
  const [pending, startTransition] = useTransition();
  if (isDefault) {
    return <span className="text-xs text-gray-400">Always active</span>;
  }
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleStoreActive(storeId, !isActive))}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
