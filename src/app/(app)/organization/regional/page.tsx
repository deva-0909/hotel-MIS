import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, Breadcrumb, StatTile } from "@/components/ui";

export default async function RegionalDashboardPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const monthStart = new Date();
  monthStart.setDate(1);

  const [{ data: properties }, { data: rooms }, { data: monthInvoices }] = await Promise.all([
    supabase.from("properties").select("id, name, city, currency").order("name"),
    supabase.from("rooms").select("property_id, status"),
    supabase.from("invoices").select("property_id, amount_paid").gte("created_at", monthStart.toISOString()),
  ]);

  const occupied = rooms?.filter((r) => r.status === "occupied").length ?? 0;
  const occupancy = rooms?.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const revenueMtd = monthInvoices?.reduce((sum, i) => sum + Number(i.amount_paid), 0) ?? 0;
  const distinctCurrencies = new Set((properties ?? []).map((p) => p.currency));
  const revenueLabel =
    distinctCurrencies.size <= 1 ? formatMoney(revenueMtd, org.currency) : `${revenueMtd.toFixed(0)} (mixed currencies)`;

  const roomsByProperty = new Map<string, { total: number; occupied: number }>();
  for (const r of rooms ?? []) {
    const entry = roomsByProperty.get(r.property_id) ?? { total: 0, occupied: 0 };
    entry.total += 1;
    if (r.status === "occupied") entry.occupied += 1;
    roomsByProperty.set(r.property_id, entry);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName]} />
      <div className="text-xs font-semibold uppercase tracking-wider text-accent">Regional</div>
      <h1 className="text-2xl text-gray-900">{org.regionName}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Properties" value={properties?.length ?? 0} />
        <StatTile label="Rooms" value={rooms?.length ?? 0} />
        <StatTile label="Occupancy" value={`${occupancy}%`} />
        <StatTile label="Revenue MTD" value={revenueLabel} />
      </div>

      <Card>
        <CardHeader title="Properties in region" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
              <th className="px-5 py-2 font-medium">Property</th>
              <th className="px-5 py-2 font-medium">City</th>
              <th className="px-5 py-2 font-medium">Rooms</th>
              <th className="px-5 py-2 font-medium">Occupancy</th>
            </tr>
          </thead>
          <tbody>
            {properties?.map((p) => {
              const stats = roomsByProperty.get(p.id) ?? { total: 0, occupied: 0 };
              const pct = stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0;
              return (
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800">{p.name}</td>
                  <td className="px-5 py-2.5 text-gray-600">{p.city ?? "—"}</td>
                  <td className="px-5 py-2.5 text-gray-600">{stats.total}</td>
                  <td className="px-5 py-2.5 text-gray-600">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
