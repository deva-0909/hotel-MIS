import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, StatTile } from "@/components/ui";

export default async function CorporateDashboardPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const monthStart = new Date();
  monthStart.setDate(1);

  const [{ data: rooms }, { data: monthInvoices }] = await Promise.all([
    supabase.from("rooms").select("status"),
    supabase.from("invoices").select("amount_paid").gte("created_at", monthStart.toISOString()),
  ]);

  const occupied = rooms?.filter((r) => r.status === "occupied").length ?? 0;
  const occupancy = rooms?.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const revenueMtd = monthInvoices?.reduce((sum, i) => sum + Number(i.amount_paid), 0) ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName]} />
      <div className="text-xs font-semibold uppercase tracking-wider text-accent">Corporate</div>
      <h1 className="text-2xl text-gray-900">Corporate Overview</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Properties" value={1} />
        <StatTile label="Total Rooms" value={rooms?.length ?? 0} />
        <StatTile label="Group Occupancy" value={`${occupancy}%`} />
        <StatTile label="Group Revenue MTD" value={`₹${revenueMtd.toFixed(0)}`} />
      </div>

      <Card>
        <CardHeader title="Region performance" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
              <th className="px-5 py-2 font-medium">Region</th>
              <th className="px-5 py-2 font-medium">Properties</th>
              <th className="px-5 py-2 font-medium">Occupancy</th>
              <th className="px-5 py-2 font-medium">Revenue MTD</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-5 py-2.5 text-gray-800">{org.regionName}</td>
              <td className="px-5 py-2.5 text-gray-600">1</td>
              <td className="px-5 py-2.5 text-gray-600">{occupancy}%</td>
              <td className="px-5 py-2.5 text-gray-600">₹{revenueMtd.toFixed(0)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-gray-400">
        This deployment currently operates a single property. The corporate/region rollup shown here reflects that
        property&apos;s real figures — additional properties can be onboarded to populate a genuine multi-property
        view.
      </p>
    </div>
  );
}
