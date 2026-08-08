"use client";

import { useTransition } from "react";
import { advancePurchaseOrderStage, rejectPurchaseOrder } from "@/app/actions/inventory";
import { Card } from "@/components/ui";

export function PurchaseBoardCard({
  poId,
  poNumber,
  supplier,
  status,
}: {
  poId: string;
  poNumber: string;
  supplier: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const canAdvance = status !== "received" && status !== "rejected";
  const canReject = status !== "received" && status !== "rejected";

  return (
    <Card className="px-3 py-2.5">
      <div className="text-sm font-medium text-gray-900">{poNumber}</div>
      <div className="text-xs text-gray-500">{supplier}</div>
      <div className="mt-2 flex gap-3 text-xs">
        {canAdvance && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => advancePurchaseOrderStage(poId, status))}
            className="text-accent hover:underline"
          >
            Advance →
          </button>
        )}
        {canReject && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => rejectPurchaseOrder(poId))}
            className="text-gray-400 hover:text-red-600 hover:underline"
          >
            Reject
          </button>
        )}
      </div>
    </Card>
  );
}
