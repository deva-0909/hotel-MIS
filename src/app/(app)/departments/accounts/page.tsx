import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, StatTile, EmptyState, Button } from "@/components/ui";

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red"> = {
  draft: "gray",
  issued: "blue",
  partially_paid: "amber",
  paid: "green",
  cancelled: "red",
};

export default async function AccountsDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const monthStart = new Date();
  monthStart.setDate(1);

  const [{ data: invoices }, { data: monthInvoices }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, amount_paid, status, guests(full_name)")
      .eq("property_id", org.propertyId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("invoices")
      .select("total_amount, amount_paid, status")
      .eq("property_id", org.propertyId)
      .gte("created_at", monthStart.toISOString()),
  ]);

  const revenueMtd = monthInvoices?.reduce((sum, i) => sum + Number(i.amount_paid), 0) ?? 0;
  const outstanding =
    invoices
      ?.filter((i) => i.status === "issued" || i.status === "partially_paid")
      .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.amount_paid)), 0) ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Accounts & Finance"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          AC
        </span>
        <h1 className="text-xl text-gray-900">Accounts &amp; Finance</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Revenue MTD" value={`₹${revenueMtd.toFixed(0)}`} />
        <StatTile label="Outstanding AR" value={`₹${outstanding.toFixed(0)}`} />
        <StatTile label="Invoices" value={invoices?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Invoices & folios" />
          {!invoices?.length ? (
            <EmptyState>No invoices yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Invoice</th>
                  <th className="px-5 py-2 font-medium">Guest</th>
                  <th className="px-5 py-2 font-medium">Amount</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5">
                      <Link href={`/billing/invoices/${inv.id}`} className="font-medium text-gray-900 hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{inv.guests?.full_name}</td>
                    <td className="px-5 py-2.5 text-gray-600">₹{inv.total_amount}</td>
                    <td className="px-5 py-2.5">
                      <Badge color={STATUS_COLOR[inv.status]}>{inv.status.replace(/_/g, " ")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <div className="flex flex-col gap-2 p-4">
            <Link href="/billing/invoices/new"><Button variant="secondary" className="w-full">Generate Invoice</Button></Link>
            <Link href="/billing/invoices"><Button variant="secondary" className="w-full">All Invoices</Button></Link>
            <Link href="/live/gst-invoice"><Button variant="secondary" className="w-full">GST Invoice View</Button></Link>
            <Link href="/accounts/chart-of-accounts"><Button variant="secondary" className="w-full">Chart of Accounts</Button></Link>
            <Link href="/accounts/journal-entries"><Button variant="secondary" className="w-full">Journal Entries</Button></Link>
            <Link href="/accounts/trial-balance"><Button variant="secondary" className="w-full">Trial Balance</Button></Link>
            <Link href="/accounts/profit-loss"><Button variant="secondary" className="w-full">Profit &amp; Loss</Button></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
