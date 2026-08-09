"use client";

import { useTransition } from "react";
import { removeEventMenuItem } from "@/app/actions/banquet";
import { Button } from "@/components/ui";

export function RemoveMenuItemButton({ eventId, itemId }: { eventId: string; itemId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      className="text-red-600 hover:bg-red-50"
      disabled={pending}
      onClick={() => startTransition(() => removeEventMenuItem(eventId, itemId))}
    >
      Remove
    </Button>
  );
}

export function PrintBeoButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
      Print BEO
    </Button>
  );
}
