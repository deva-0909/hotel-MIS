import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createPosTerminal } from "@/app/actions/pos-terminals";
import { PosTerminalActiveToggle, DeletePosTerminalButton } from "./pos-terminal-actions";

export default async function PosTerminalsPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: terminals }, { data: restaurants }] = await Promise.all([
    supabase
      .from("pos_terminals")
      .select("id, name, identifier, is_active, restaurants(name)")
      .eq("property_id", org.propertyId)
      .order("name"),
    supabase.from("restaurants").select("id, name").eq("property_id", org.propertyId).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "POS Terminals"]} />
      <h1 className="text-xl text-gray-900">POS Terminals</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Register each checkout terminal at this property and, optionally, tie it to a restaurant.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Terminals (${terminals?.length ?? 0})`} />
          {!terminals?.length ? (
            <EmptyState>No POS terminals registered yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Restaurant</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {terminals.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2 font-medium text-gray-900">
                      {t.name}
                      {t.identifier && <div className="text-xs text-gray-400">{t.identifier}</div>}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{t.restaurants?.name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <PosTerminalActiveToggle terminalId={t.id} isActive={t.is_active} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DeletePosTerminalButton terminalId={t.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add terminal" />
          <form action={createPosTerminal} className="space-y-2 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Front Desk POS" />
            </div>
            <div>
              <Label>Identifier (optional)</Label>
              <Input name="identifier" placeholder="e.g. serial / register no." />
            </div>
            <div>
              <Label>Restaurant (optional)</Label>
              <Select name="restaurant_id" defaultValue="">
                <option value="">Not tied to a restaurant</option>
                {restaurants?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <SubmitButton variant="secondary">Add terminal</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
