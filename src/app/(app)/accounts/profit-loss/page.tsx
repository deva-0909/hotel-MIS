import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, EmptyState } from "@/components/ui";

export default async function ProfitLossPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, code, name, account_type, journal_entry_lines(debit, credit)")
    .eq("property_id", org.propertyId)
    .in("account_type", ["revenue", "expense"])
    .order("code");

  const withNet = (accounts ?? [])
    .map((a) => {
      const debit = a.journal_entry_lines?.reduce((sum, l) => sum + Number(l.debit), 0) ?? 0;
      const credit = a.journal_entry_lines?.reduce((sum, l) => sum + Number(l.credit), 0) ?? 0;
      // Revenue accounts grow on the credit side, expense accounts on the
      // debit side — net is expressed positive when the account moved in
      // its natural direction.
      const net = a.account_type === "revenue" ? credit - debit : debit - credit;
      return { id: a.id, name: a.name, account_type: a.account_type, net };
    })
    .filter((a) => a.net !== 0);

  const revenue = withNet.filter((a) => a.account_type === "revenue");
  const expense = withNet.filter((a) => a.account_type === "expense");
  const totalRevenue = revenue.reduce((sum, a) => sum + a.net, 0);
  const totalExpense = expense.reduce((sum, a) => sum + a.net, 0);
  const netProfit = totalRevenue - totalExpense;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Profit & Loss"]} />
      <h1 className="text-xl text-gray-900">Profit &amp; Loss</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Revenue — ₹${totalRevenue.toFixed(2)}`} />
          {!revenue.length ? (
            <EmptyState>No revenue posted yet.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {revenue.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-2 text-sm">
                  <span className="text-gray-700">{a.name}</span>
                  <span className="text-gray-900">₹{a.net.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={`Expenses — ₹${totalExpense.toFixed(2)}`} />
          {!expense.length ? (
            <EmptyState>No expenses posted yet.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {expense.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-2 text-sm">
                  <span className="text-gray-700">{a.name}</span>
                  <span className="text-gray-900">₹{a.net.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className={`px-5 py-4 text-lg font-semibold ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
        Net {netProfit >= 0 ? "Profit" : "Loss"}: ₹{Math.abs(netProfit).toFixed(2)}
      </Card>
    </div>
  );
}
