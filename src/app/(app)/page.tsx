import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, StatTile, Badge, Breadcrumb, EmptyState } from "@/components/ui";

const DEPARTMENTS = [
  { code: "FO", href: "/departments/front-office", label: "Front Office" },
  { code: "HK", href: "/departments/housekeeping", label: "Housekeeping" },
  { code: "RS", href: "/departments/restaurant", label: "Restaurant" },
  { code: "KT", href: "/departments/kitchen", label: "Kitchen" },
  { code: "SP", href: "/departments/stores-purchase", label: "Stores & Purchase" },
  { code: "EM", href: "/departments/engineering", label: "Engineering & Maintenance" },
  { code: "HR", href: "/departments/hr", label: "Human Resources" },
  { code: "AC", href: "/departments/accounts", label: "Accounts & Finance" },
  { code: "CM", href: "/departments/crm", label: "CRM & Marketing" },
  { code: "BQ", href: "/departments/banquet", label: "Banquet & Events" },
  { code: "SL", href: "/departments/spa-laundry", label: "Spa & Laundry" },
  { code: "TD", href: "/departments/travel-desk", label: "Travel Desk" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: rooms },
    { data: arrivals },
    { data: departures },
    { data: openOrders },
    { data: rawInventoryItems },
    { data: inHouseRates },
  ] = await Promise.all([
    supabase.from("rooms").select("status").eq("property_id", org.propertyId),
    supabase
      .from("reservations")
      .select("id, reservation_number, guests(full_name), rooms(room_number)")
      .eq("property_id", org.propertyId)
      .eq("check_in_date", today)
      .eq("status", "confirmed"),
    supabase
      .from("reservations")
      .select("id, reservation_number, guests(full_name), rooms(room_number)")
      .eq("property_id", org.propertyId)
      .eq("check_out_date", today)
      .eq("status", "checked_in"),
    supabase
      .from("orders")
      .select("id, order_number, order_type, status, restaurant_tables(table_number)")
      .eq("property_id", org.propertyId)
      .in("status", ["open", "sent_to_kitchen", "preparing", "ready", "served"]),
    supabase
      .from("inventory_items")
      .select("id, name, unit, property_inventory(current_stock, reorder_level)")
      .eq("property_inventory.property_id", org.propertyId),
    supabase.from("reservations").select("rate_per_night").eq("property_id", org.propertyId).eq("status", "checked_in"),
  ]);

  const occupied = rooms?.filter((r) => r.status === "occupied").length ?? 0;
  const totalRooms = rooms?.length ?? 0;
  const occupancyPct = totalRooms ? Math.round((occupied / totalRooms) * 100) : 0;
  const inventoryItems = (rawInventoryItems ?? []).map((i) => ({
    ...i,
    current_stock: i.property_inventory[0]?.current_stock ?? 0,
    reorder_level: i.property_inventory[0]?.reorder_level ?? 0,
  }));
  const lowStock = inventoryItems.filter((i) => Number(i.current_stock) <= Number(i.reorder_level));
  const adr = inHouseRates?.length
    ? inHouseRates.reduce((sum, r) => sum + Number(r.rate_per_night), 0) / inHouseRates.length
    : 0;
  const revpar = adr * (occupancyPct / 100);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName]} />
      <div className="text-xs font-semibold uppercase tracking-wider text-accent">Property</div>
      <h1 className="text-2xl text-gray-900">{org.hotelName}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Rooms" value={totalRooms} />
        <StatTile label="Occupancy" value={`${occupancyPct}%`} sub={`${occupied} of ${totalRooms} rooms`} />
        <StatTile label="ADR" value={formatMoney(adr, org.currency)} />
        <StatTile label="RevPAR" value={formatMoney(revpar, org.currency)} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">Departments</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DEPARTMENTS.map((d) => (
            <Link key={d.href} href={d.href}>
              <Card className="px-4 py-3 transition-colors hover:border-accent/40">
                <span className="mb-1.5 inline-flex h-6 w-8 items-center justify-center rounded border border-accent/40 text-[10px] font-medium text-accent">
                  {d.code}
                </span>
                <div className="text-sm font-medium text-gray-900">{d.label}</div>
              </Card>
            </Link>
          ))}
        </div>
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
