"use client";

import { useTransition } from "react";
import { cancelInvoice } from "@/app/actions/billing";
import { postInvoiceToLedger, postPaymentToLedger } from "@/app/actions/ledger";
import { Button } from "@/components/ui";

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="danger" disabled={pending} onClick={() => startTransition(() => cancelInvoice(invoiceId))}>
      Cancel invoice
    </Button>
  );
}

export function PostInvoiceToLedgerButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => postInvoiceToLedger(invoiceId))}>
      Post to ledger
    </Button>
  );
}

export function PostPaymentToLedgerButton({ paymentId, invoiceId }: { paymentId: string; invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => postPaymentToLedger(paymentId, invoiceId))}
      className="text-xs text-accent hover:underline disabled:opacity-50"
    >
      Post to ledger
    </button>
  );
}
