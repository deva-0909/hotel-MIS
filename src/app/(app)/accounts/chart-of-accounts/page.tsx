import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { createAccount, seedChartOfAccounts } from "@/app/actions/ledger";
import { Card, CardHeader, Badge, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const TYPE_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple" | "gold"> = {
  asset: "blue",
  liability: "amber",
  equity: "purple",
  revenue: "green",
  expense: "red",
};

export default async function ChartOfAccountsPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, code, name, account_type, is_active, parent_id")
    .eq("property_id", org.propertyId)
    .order("code");

  const nameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Chart of Accounts"]} />
      <h1 className="text-xl text-gray-900">Chart of Accounts</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-x-auto">
          <CardHeader title={`Accounts (${accounts?.length ?? 0})`} />
          {!accounts?.length ? (
            <EmptyState>
              <p className="mb-3">No accounts set up yet.</p>
              <form action={seedChartOfAccounts}>
                <SubmitButton variant="secondary">Seed standard chart of accounts</SubmitButton>
              </form>
            </EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Parent</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2 font-medium text-gray-900">{a.code}</td>
                    <td className="px-3 py-2 text-gray-700">{a.name}</td>
                    <td className="px-3 py-2">
                      <Badge color={TYPE_COLOR[a.account_type]}>{a.account_type}</Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{a.parent_id ? nameById.get(a.parent_id) : "—"}</td>
                    <td className="px-3 py-2">
                      <Badge color={a.is_active ? "green" : "gray"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add account" />
          <form action={createAccount} className="space-y-2 px-5 py-4">
            <div>
              <Label>Code</Label>
              <Input name="code" required placeholder="e.g. REV-SPA" />
            </div>
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Spa Revenue" />
            </div>
            <div>
              <Label>Type</Label>
              <Select name="account_type" required defaultValue="">
                <option value="" disabled>
                  Select type…
                </option>
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </Select>
            </div>
            <div>
              <Label>Parent account (optional)</Label>
              <Select name="parent_id" defaultValue="">
                <option value="">None</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </Select>
            </div>
            <SubmitButton>Add account</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
