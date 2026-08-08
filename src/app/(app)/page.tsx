import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, StatTile, Badge, EmptyState } from "@/components/ui";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: rooms },
    { data: arrivals },
    { data: departures },
    { data: openOrders },
    { data: inventoryItems },
    { data: openInvoices },
  ] = await Promise.all([
    supabase.from("rooms").select("status"),
    supabase
      .from("reservations")
      .select("id, reservation_number, guests(full_name), rooms(room_number)")
      .eq("check_in_date", today)
      .eq("status", "confirmed"),
    supabase
      .from("reservations")
      .select("id, reservation_number, guests(full_name), rooms(room_number)")
      .eq("check_out_date", today)
      .eq("status", "checked_in"),
    supabase
      .from("orders")
      .select("id, order_number, order_type, status, restaurant_tables(table_number)")
      .in("status", ["open", "sent_to_kitchen", "preparing", "ready", "served"]),
    supabase.from("inventory_items").select("id, name, current_stock, reorder_level, unit"),
    supabase.from("invoices").select("id, invoice_number, total_amount, amount_paid").in("status", ["issued", "partially_paid"]),
  ]);

  const occupied = rooms?.filter((r) => r.status === "occupied").length ?? 0;
  const totalRooms = rooms?.length ?? 0;
  const occupancyPct = totalRooms ? Math.round((occupied / totalRooms) * 100) : 0;
  const lowStock = inventoryItems?.filter((i) => Number(i.current_stock) <= Number(i.reorder_level)) ?? [];
  const outstanding = openInvoices?.reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.amount_paid)), 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Occupancy" value={`${occupancyPct}%`} sub={`${occupied} of ${totalRooms} rooms`} />
        <StatTile label="Open restaurant orders" value={openOrders?.length ?? 0} />
        <StatTile label="Low stock items" value={lowStock.length} />
        <StatTile label="Outstanding balance" value={`₹${outstanding.toFixed(0)}`} sub={`${openInvoices?.length ?? 0} unpaid invoices`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Today's arrivals (${arrivals?.length ?? 0})`} />
          {!arrivals?.length ? (
            <EmptyState>No arrivals scheduled for today.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {arrivals.map((r) => (
                <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-gray-50">
                  <span className="text-gray-800">{r.guests?.full_name}</span>
                  <span className="text-gray-500">{r.rooms?.room_number ?? "Unassigned"}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={`Today's departures (${departures?.length ?? 0})`} />
          {!departures?.length ? (
            <EmptyState>No departures scheduled for today.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {departures.map((r) => (
                <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-gray-50">
                  <span className="text-gray-800">{r.guests?.full_name}</span>
                  <span className="text-gray-500">{r.rooms?.room_number ?? "—"}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={`Open orders (${openOrders?.length ?? 0})`} />
          {!openOrders?.length ? (
            <EmptyState>No open orders.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {openOrders.map((o) => (
                <Link key={o.id} href={`/restaurant/orders/${o.id}`} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-gray-50">
                  <span className="text-gray-800">
                    {o.order_number} · {o.restaurant_tables?.table_number ?? o.order_type.replace(/_/g, " ")}
                  </span>
                  <Badge color="amber">{o.status.replace(/_/g, " ")}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={`Low stock (${lowStock.length})`} />
          {!lowStock.length ? (
            <EmptyState>All stock levels are healthy.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {lowStock.map((i) => (
                <Link key={i.id} href="/inventory/items" className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-gray-50">
                  <span className="text-gray-800">{i.name}</span>
                  <span className="text-amber-600">
                    {i.current_stock} {i.unit} left
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
