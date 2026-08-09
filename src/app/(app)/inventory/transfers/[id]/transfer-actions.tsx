"use client";

import { useTransition } from "react";
import { cancelTransfer, markTransferInTransit, receiveTransfer, removeTransferItem } from "@/app/actions/transfers";
import { Button } from "@/components/ui";

export function TransferLifecycleActions({ transferId, status }: { transferId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {status === "requested" && (
        <Button disabled={pending} onClick={() => startTransition(() => markTransferInTransit(transferId))}>
          Mark in transit
        </Button>
      )}
      {(status === "requested" || status === "in_transit") && (
        <Button disabled={pending} onClick={() => startTransition(() => receiveTransfer(transferId))}>
          Receive
        </Button>
      )}
      {(status === "requested" || status === "in_transit") && (
        <Button variant="danger" disabled={pending} onClick={() => startTransition(() => cancelTransfer(transferId))}>
          Cancel
        </Button>
      )}
    </div>
  );
}

export function RemoveTransferItemButton({ transferId, itemId }: { transferId: string; itemId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => removeTransferItem(transferId, itemId))}
      className="text-xs text-red-500 hover:text-red-700"
    >
      Remove
    </button>
  );
}
