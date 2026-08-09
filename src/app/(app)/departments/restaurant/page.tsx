import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, StatTile, EmptyState, Button } from "@/components/ui";

export default async function RestaurantDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const todayStart = new Date().toISOString().slice(0, 10) + "T00:00:00Z";

  const { data: restaurants } = await supabase.from("restaurants").select("id").eq("property_id", org.propertyId);
  const restaurantIds = (restaurants ?? []).map((r) => r.id);

  const [{ data: tables }, { data: openOrders }, { data: todayOrders }] = await Promise.all([
    restaurantIds.length
      ? supabase.from("restaurant_tables").select("id, status").in("restaurant_id", restaurantIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("orders")
      .select("id, order_number, order_type, status, restaurant_tables(table_number)")
      .eq("property_id", org.propertyId)
      .in("status", ["open", "sent_to_kitchen", "preparing", "ready", "served"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("orders").select("id, order_type").eq("property_id", org.propertyId).gte("created_at", todayStart),
  ]);

  const occupiedTables = tables?.filter((t) => t.status === "occupied").length ?? 0;
  const channelCounts = (todayOrders ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.order_type] = (acc[o.order_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Restaurant"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          RS
        </span>
        <h1 className="text-xl text-gray-900">Restaurant</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Orders Today" value={todayOrders?.length ?? 0} />
        <StatTile label="Open Tables" value={`${occupiedTables} / ${tables?.length ?? 0}`} />
        <StatTile label="Dine-In" value={channelCounts.dine_in ?? 0} />
        <StatTile label="Room Service" value={channelCounts.room_service ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Open orders" />
          {!openOrders?.length ? (
            <EmptyState>No open orders.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Order</th>
                  <th className="px-5 py-2 font-medium">Table / Type</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {openOrders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5">
                      <Link href={`/restaurant/orders/${o.id}`} className="font-medium text-gray-900 hover:underline">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{o.restaurant_tables?.table_number ?? o.order_type.replace(/_/g, " ")}</td>
                    <td className="px-5 py-2.5">
                      <Badge color="amber">{o.status.replace(/_/g, " ")}</Badge>
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
            <Link href="/restaurant/orders/new"><Button variant="secondary" className="w-full">New Order</Button></Link>
            <Link href="/restaurant/tables"><Button variant="secondary" className="w-full">View Tables</Button></Link>
            <Link href="/restaurant/menu"><Button variant="secondary" className="w-full">Menu Management</Button></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
