"use client";

import { useTransition } from "react";
import { billOrder, cancelOrder, markOrderReady, markOrderServed, removeOrderItem, sendOrderToKitchen } from "@/app/actions/restaurant";
import { Button } from "@/components/ui";

export function OrderLifecycleActions({ orderId, status }: { orderId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" && (
        <>
          <Button disabled={pending} onClick={() => startTransition(() => sendOrderToKitchen(orderId))}>
            Send to kitchen
          </Button>
          <Button variant="danger" disabled={pending} onClick={() => startTransition(() => cancelOrder(orderId))}>
            Cancel
          </Button>
        </>
      )}
      {status === "sent_to_kitchen" && (
        <Button disabled={pending} onClick={() => startTransition(() => markOrderReady(orderId))}>
          Mark ready
        </Button>
      )}
      {status === "ready" && (
        <Button disabled={pending} onClick={() => startTransition(() => markOrderServed(orderId))}>
          Mark served
        </Button>
      )}
      {status === "served" && (
        <Button disabled={pending} onClick={() => startTransition(() => billOrder(orderId))}>
          Bill order
        </Button>
      )}
    </div>
  );
}

export function RemoveItemButton({ orderId, itemId }: { orderId: string; itemId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => removeOrderItem(orderId, itemId))}
      className="text-xs text-red-500 hover:text-red-700"
    >
      Remove
    </button>
  );
}
