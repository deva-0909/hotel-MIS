"use client";

import { useTransition } from "react";
import { unlinkKitchenProperty } from "@/app/actions/kitchens";

export function UnlinkPropertyButton({ kitchenId, propertyId }: { kitchenId: string; propertyId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => unlinkKitchenProperty(kitchenId, propertyId))}
      aria-label="Remove property from this kitchen"
      className="text-gray-400 hover:text-red-500 disabled:opacity-50"
    >
      ×
    </button>
  );
}
