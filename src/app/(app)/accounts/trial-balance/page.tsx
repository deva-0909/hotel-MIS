import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, Breadcrumb, EmptyState } from "@/components/ui";

export default async function TrialBalancePage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, code, name, account_type, journal_entry_lines(debit, credit)")
    .eq("property_id", org.propertyId)
    .order("code");

  const rows = (accounts ?? [])
    .map((a) => {
      const debit = a.journal_entry_lines?.reduce((sum, l) => sum + Number(l.debit), 0) ?? 0;
      const credit = a.journal_entry_lines?.reduce((sum, l) => sum + Number(l.credit), 0) ?? 0;
      return { id: a.id, code: a.code, name: a.name, account_type: a.account_type, debit, credit };
    })
    .filter((r) => r.debit !== 0 || r.credit !== 0);

  const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Trial Balance"]} />
      <h1 className="text-xl text-gray-900">Trial Balance</h1>

      <Card>
        <CardHeader
          title="All account activity"
          action={
            rows.length > 0 && (
              <span className={balanced ? "text-xs text-emerald-600" : "text-xs text-red-600"}>
                {balanced ? "Balanced" : "Out of balance"}
              </span>
            )
          }
        />
        {!rows.length ? (
          <EmptyState>No ledger activity yet — post an invoice/payment or create a journal entry.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Debit</th>
                <th className="px-3 py-2 font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2 text-gray-800">
                    {r.code} — {r.name}
                  </td>
                  <td className="px-3 py-2 capitalize text-gray-500">{r.account_type}</td>
                  <td className="px-3 py-2 text-gray-700">{r.debit ? formatMoney(r.debit, org.currency) : ""}</td>
                  <td className="px-3 py-2 text-gray-700">{r.credit ? formatMoney(r.credit, org.currency) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-semibold text-gray-900">
                <td className="px-5 py-2" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-2">{formatMoney(totalDebit, org.currency)}</td>
                <td className="px-3 py-2">{formatMoney(totalCredit, org.currency)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Card>
    </div>
  );
}
