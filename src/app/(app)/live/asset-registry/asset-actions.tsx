"use client";

import { useTransition } from "react";
import { updateAssetStatus } from "@/app/actions/engineering";
import { Select } from "@/components/ui";

type AssetStatus = "operational" | "under_maintenance" | "needs_attention";

export function AssetStatusControl({ assetId, status }: { assetId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateAssetStatus(assetId, e.target.value as AssetStatus))}
      className="text-xs"
    >
      <option value="operational">Operational</option>
      <option value="under_maintenance">Under Maintenance</option>
      <option value="needs_attention">Needs Attention</option>
    </Select>
  );
}
