import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, Badge, Breadcrumb, StatTile, EmptyState, Button } from "@/components/ui";

export default async function FrontOfficeDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: rooms }, { data: arrivals }, { data: departures }, { data: inHouse }] = await Promise.all([
    supabase.from("rooms").select("status").eq("property_id", org.propertyId),
    supabase.from("reservations").select("id").eq("property_id", org.propertyId).eq("check_in_date", today).eq("status", "confirmed"),
    supabase.from("reservations").select("id").eq("property_id", org.propertyId).eq("check_out_date", today).eq("status", "checked_in"),
    supabase
      .from("reservations")
      .select("id, check_in_date, check_out_date, rate_per_night, status, guests(full_name), rooms(room_number)")
      .eq("property_id", org.propertyId)
      .in("status", ["confirmed", "checked_in"])
      .order("check_in_date", { ascending: false })
      .limit(8),
  ]);

  const occupied = rooms?.filter((r) => r.status === "occupied").length ?? 0;
  const occupancy = rooms?.length ? Math.round((occupied / rooms.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Front Office"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          FO
        </span>
        <h1 className="text-xl text-gray-900">Front Office</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Occupancy" value={`${occupancy}%`} />
        <StatTile label="Arrivals Today" value={arrivals?.length ?? 0} />
        <StatTile label="Departures Today" value={departures?.length ?? 0} />
        <StatTile label="Total Rooms" value={rooms?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Guests in-house / arriving" />
          {!inHouse?.length ? (
            <EmptyState>No active reservations.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Room</th>
                  <th className="px-5 py-2 font-medium">Guest</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {inHouse.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-800">{r.rooms?.room_number ?? "Unassigned"}</td>
                    <td className="px-5 py-2.5 text-gray-800">{r.guests?.full_name}</td>
                    <td className="px-5 py-2.5">
                      <Badge color={r.status === "checked_in" ? "blue" : "purple"}>{r.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{formatMoney(r.rate_per_night, org.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <div className="flex flex-col gap-2 p-4">
            <Link href="/reservations/new"><Button variant="secondary" className="w-full">New Reservation</Button></Link>
            <Link href="/reservations"><Button variant="secondary" className="w-full">Check-In Guest</Button></Link>
            <Link href="/rooms"><Button variant="secondary" className="w-full">Room Status Board</Button></Link>
            <Link href="/guests"><Button variant="secondary" className="w-full">Guest Directory</Button></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
