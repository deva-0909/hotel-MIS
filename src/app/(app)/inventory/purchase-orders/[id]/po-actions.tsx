"use client";

import { useState, useTransition } from "react";
import { markPurchaseOrderOrdered, receivePurchaseOrderItem } from "@/app/actions/inventory";
import { Button, Input } from "@/components/ui";

export function MarkOrderedButton({ poId }: { poId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button disabled={pending} onClick={() => startTransition(() => markPurchaseOrderOrdered(poId))}>
      Mark as ordered
    </Button>
  );
}

export function ReceiveLineControl({ poId, poItemId, outstanding }: { poId: string; poItemId: string; outstanding: number }) {
  const [qty, setQty] = useState(outstanding);
  const [pending, startTransition] = useTransition();

  if (outstanding <= 0) return <span className="text-xs text-emerald-600">Fully received</span>;

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        max={outstanding}
        step="0.001"
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        className="w-24"
      />
      <Button
        variant="secondary"
        disabled={pending || qty <= 0}
        onClick={() => startTransition(() => receivePurchaseOrderItem(poId, poItemId, qty))}
      >
        Receive
      </Button>
    </div>
  );
}
