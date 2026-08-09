import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, Badge, Button, EmptyState } from "@/components/ui";

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red"> = {
  draft: "gray",
  issued: "blue",
  partially_paid: "amber",
  paid: "green",
  cancelled: "red",
};

export default async function InvoicesPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total_amount, amount_paid, created_at, guests(full_name)")
    .eq("property_id", org.propertyId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Invoices</h1>
        <Link href="/billing/invoices/new">
          <Button>New invoice</Button>
        </Link>
      </div>

      <Card>
        {!invoices?.length ? (
          <EmptyState>No invoices yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Invoice</th>
                <th className="px-5 py-2 font-medium">Guest</th>
                <th className="px-5 py-2 font-medium">Total</th>
                <th className="px-5 py-2 font-medium">Paid</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-2.5">
                    <Link href={`/billing/invoices/${inv.id}`} className="font-medium text-slate-900 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-gray-700">{inv.guests?.full_name}</td>
                  <td className="px-5 py-2.5 text-gray-700">₹{inv.total_amount}</td>
                  <td className="px-5 py-2.5 text-gray-600">₹{inv.amount_paid}</td>
                  <td className="px-5 py-2.5">
                    <Badge color={STATUS_COLOR[inv.status]}>{inv.status.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
