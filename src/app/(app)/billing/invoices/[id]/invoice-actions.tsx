"use client";

import { useTransition } from "react";
import { cancelInvoice } from "@/app/actions/billing";
import { Button } from "@/components/ui";

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="danger" disabled={pending} onClick={() => startTransition(() => cancelInvoice(invoiceId))}>
      Cancel invoice
    </Button>
  );
}
