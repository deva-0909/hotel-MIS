import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, StatTile, EmptyState } from "@/components/ui";

export default async function KitchenDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: tickets } = await supabase
    .from("order_items")
    .select(
      "id, quantity, status, kot_sent_at, menu_items(name), orders(order_number, restaurant_tables(table_number))",
    )
    .in("status", ["pending", "preparing"])
    .order("kot_sent_at", { ascending: true, nullsFirst: true });

  const preparing = tickets?.filter((t) => t.status === "preparing").length ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Kitchen"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          KT
        </span>
        <h1 className="text-xl text-gray-900">Kitchen</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Open Tickets" value={tickets?.length ?? 0} />
        <StatTile label="Cooking" value={preparing} />
      </div>

      <Card>
        <CardHeader title="Kitchen order ticket queue" />
        {!tickets?.length ? (
          <EmptyState>No open tickets.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Order</th>
                <th className="px-5 py-2 font-medium">Table</th>
                <th className="px-5 py-2 font-medium">Item</th>
                <th className="px-5 py-2 font-medium">Qty</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800">{t.orders?.order_number}</td>
                  <td className="px-5 py-2.5 text-gray-600">{t.orders?.restaurant_tables?.table_number ?? "—"}</td>
                  <td className="px-5 py-2.5 text-gray-800">{t.menu_items?.name}</td>
                  <td className="px-5 py-2.5 text-gray-600">{t.quantity}</td>
                  <td className="px-5 py-2.5">
                    <Badge color={t.status === "preparing" ? "amber" : "gray"}>{t.status}</Badge>
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
