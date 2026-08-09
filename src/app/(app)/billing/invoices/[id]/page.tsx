import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addInvoiceLineItem, recordPayment, updateInvoiceAdjustments } from "@/app/actions/billing";
import { Card, CardHeader, Badge, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { CancelInvoiceButton, PostInvoiceToLedgerButton, PostPaymentToLedgerButton } from "./invoice-actions";

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red"> = {
  draft: "gray",
  issued: "blue",
  partially_paid: "amber",
  paid: "green",
  cancelled: "red",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, subtotal, tax_amount, discount_amount, total_amount, amount_paid, notes, guests(full_name, phone)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  const [{ data: lineItems }, { data: payments }] = await Promise.all([
    supabase.from("invoice_line_items").select("id, description, source_type, quantity, unit_price, amount").eq("invoice_id", id).order("created_at"),
    supabase.from("payments").select("id, amount, method, reference_number, paid_at").eq("invoice_id", id).order("paid_at"),
  ]);

  const balanceDue = Number(invoice.total_amount) - Number(invoice.amount_paid);
  const editable = invoice.status !== "cancelled" && invoice.status !== "paid";

  const paymentIds = (payments ?? []).map((p) => p.id);
  const { data: journalSources } = await supabase
    .from("journal_entries")
    .select("id, source_table, source_id")
    .in("source_table", ["invoices", "payments"])
    .in("source_id", [invoice.id, ...paymentIds]);
  const invoiceJournalEntry = journalSources?.find((j) => j.source_table === "invoices" && j.source_id === invoice.id);
  const postedPaymentIds = new Set(
    (journalSources ?? []).filter((j) => j.source_table === "payments").map((j) => j.source_id),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{invoice.invoice_number}</h1>
            <Badge color={STATUS_COLOR[invoice.status]}>{invoice.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {invoice.guests?.full_name} {invoice.guests?.phone ? `· ${invoice.guests.phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status !== "draft" && invoice.status !== "cancelled" && (
            <>
              {invoiceJournalEntry ? (
                <Badge color="blue">Posted to ledger</Badge>
              ) : (
                <PostInvoiceToLedgerButton invoiceId={invoice.id} />
              )}
            </>
          )}
          {editable && !payments?.length && <CancelInvoiceButton invoiceId={invoice.id} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Line items" />
            {!lineItems?.length ? (
              <EmptyState>No line items yet.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                    <th className="px-5 py-2 font-medium">Description</th>
                    <th className="px-5 py-2 font-medium">Qty</th>
                    <th className="px-5 py-2 font-medium">Unit price</th>
                    <th className="px-5 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 text-gray-800">{li.description}</td>
                      <td className="px-5 py-2.5 text-gray-600">{li.quantity}</td>
                      <td className="px-5 py-2.5 text-gray-600">₹{li.unit_price}</td>
                      <td className="px-5 py-2.5 text-gray-800">₹{Number(li.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {editable && (
              <form action={addInvoiceLineItem.bind(null, invoice.id)} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
                <div className="flex-1">
                  <Label>Description</Label>
                  <Input name="description" required placeholder="e.g. Late checkout fee" />
                </div>
                <div className="w-20">
                  <Label>Qty</Label>
                  <Input name="quantity" type="number" min={1} defaultValue={1} />
                </div>
                <div className="w-28">
                  <Label>Unit price</Label>
                  <Input name="unit_price" type="number" min={0} step="0.01" required />
                </div>
                <SubmitButton variant="secondary">Add</SubmitButton>
              </form>
            )}

            <div className="space-y-1 border-t border-gray-100 px-5 py-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{invoice.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>₹{invoice.tax_amount}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span>−₹{invoice.discount_amount}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold text-gray-900">
                <span>Total</span>
                <span>₹{invoice.total_amount}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Paid</span>
                <span>₹{invoice.amount_paid}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Balance due</span>
                <span>₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>

            {editable && (
              <form
                action={updateInvoiceAdjustments.bind(null, invoice.id)}
                className="flex items-end gap-2 border-t border-gray-100 px-5 py-4"
              >
                <div className="w-32">
                  <Label>Tax amount</Label>
                  <Input name="tax_amount" type="number" min={0} step="0.01" defaultValue={invoice.tax_amount} />
                </div>
                <div className="w-32">
                  <Label>Discount amount</Label>
                  <Input name="discount_amount" type="number" min={0} step="0.01" defaultValue={invoice.discount_amount} />
                </div>
                <SubmitButton variant="secondary">Update</SubmitButton>
              </form>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Payments" />
          {!payments?.length ? (
            <EmptyState>No payments recorded.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <div>
                    <div className="text-gray-800">₹{p.amount}</div>
                    <div className="text-xs capitalize text-gray-400">
                      {p.method.replace(/_/g, " ")} {p.reference_number ? `· ${p.reference_number}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs text-gray-400">{new Date(p.paid_at).toLocaleDateString()}</div>
                    {postedPaymentIds.has(p.id) ? (
                      <span className="text-xs text-emerald-600">Posted</span>
                    ) : (
                      <PostPaymentToLedgerButton paymentId={p.id} invoiceId={invoice.id} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {balanceDue > 0 && invoice.status !== "cancelled" && (
            <form action={recordPayment.bind(null, invoice.id)} className="space-y-2 border-t border-gray-100 px-5 py-4">
              <div>
                <Label>Amount</Label>
                <Input name="amount" type="number" min={0.01} step="0.01" max={balanceDue} defaultValue={balanceDue.toFixed(2)} required />
              </div>
              <div>
                <Label>Method</Label>
                <Select name="method" defaultValue="cash">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <Label>Reference number</Label>
                <Input name="reference_number" />
              </div>
              <SubmitButton>Record payment</SubmitButton>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
