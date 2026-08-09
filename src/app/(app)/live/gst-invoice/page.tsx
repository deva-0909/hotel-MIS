import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, Breadcrumb, EmptyState } from "@/components/ui";

export default async function GstInvoicePage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice: invoiceId } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, guests(full_name)")
    .eq("property_id", org.propertyId)
    .order("created_at", { ascending: false })
    .limit(20);

  const activeId = invoiceId ?? invoices?.[0]?.id;

  const { data: invoice } = activeId
    ? await supabase
        .from("invoices")
        .select("id, invoice_number, subtotal, tax_amount, total_amount, guests(full_name)")
        .eq("id", activeId)
        .maybeSingle()
    : { data: null };

  const { data: lineItems } = activeId
    ? await supabase.from("invoice_line_items").select("description, quantity, unit_price, amount").eq("invoice_id", activeId)
    : { data: null };

  // Presented as an even CGST/SGST split of whatever tax_amount actually
  // computed to (see /accounts/tax-rates) — not a fixed 9%/9%, since the
  // configured rate can be anything.
  const cgst = invoice ? Number(invoice.tax_amount) / 2 : 0;
  const sgst = cgst;
  const effectiveRate = invoice && Number(invoice.subtotal) > 0 ? (Number(invoice.tax_amount) / Number(invoice.subtotal)) * 100 : 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "GST Invoice"]} />
      <h1 className="text-xl text-gray-900">GST-Itemized Invoice</h1>
      <p className="-mt-4 text-sm text-gray-500">Full CGST/SGST tax breakdown for the selected invoice.</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Invoices" />
          {!invoices?.length ? (
            <EmptyState>No invoices yet.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/live/gst-invoice?invoice=${inv.id}`}
                  className={`block px-4 py-2 text-sm hover:bg-gray-50 ${inv.id === activeId ? "bg-accent-soft text-accent" : "text-gray-700"}`}
                >
                  {inv.invoice_number} — {inv.guests?.full_name}
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          {!invoice ? (
            <EmptyState>Select an invoice to view its tax breakdown.</EmptyState>
          ) : (
            <>
              <CardHeader title={`${invoice.invoice_number} — ${invoice.guests?.full_name}`} />
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                    <th className="px-5 py-2 font-medium">Line item</th>
                    <th className="px-5 py-2 font-medium">Qty</th>
                    <th className="px-5 py-2 font-medium">Rate</th>
                    <th className="px-5 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems?.map((li, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 text-gray-800">{li.description}</td>
                      <td className="px-5 py-2.5 text-gray-600">{li.quantity}</td>
                      <td className="px-5 py-2.5 text-gray-600">{formatMoney(li.unit_price, org.currency)}</td>
                      <td className="px-5 py-2.5 text-gray-800">{formatMoney(li.amount, org.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 border-t border-black/10 px-5 py-4 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatMoney(invoice.subtotal, org.currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>CGST @ {(effectiveRate / 2).toFixed(2)}%</span>
                  <span>{formatMoney(cgst, org.currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>SGST @ {(effectiveRate / 2).toFixed(2)}%</span>
                  <span>{formatMoney(sgst, org.currency)}</span>
                </div>
                <div className="flex justify-between border-t border-black/10 pt-1 font-semibold text-gray-900">
                  <span>Total Payable</span>
                  <span>{formatMoney(invoice.total_amount, org.currency)}</span>
                </div>
                {org.gstin && (
                  <div className="flex justify-between pt-2 text-xs text-gray-400">
                    <span>GSTIN</span>
                    <span>{org.gstin}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
