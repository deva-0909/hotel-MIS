import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { getPropertyToday } from "@/lib/format-datetime";
import { Card, Breadcrumb, EmptyState } from "@/components/ui";
import { RoomRackGrid } from "./room-rack-grid";

const DAYS = 14;

export default async function RoomCalendarPage({ searchParams }: { searchParams: Promise<{ floor?: string }> }) {
  const { floor } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, room_number, status, room_type_id, room_types(name, base_rate), floors(name)")
    .eq("property_id", org.propertyId)
    .order("room_number");
  const floors = Array.from(new Set((rooms ?? []).map((r) => r.floors?.name).filter(Boolean))) as string[];
  const activeFloor = floor && floors.includes(floor) ? floor : floors[0];
  const floorRooms = rooms?.filter((r) => r.floors?.name === activeFloor) ?? [];

  // Anchored on the property's own "today" (not the server's UTC today) so
  // the calendar window doesn't drift a day off around midnight UTC.
  const dates: string[] = [];
  const anchor = new Date(`${getPropertyToday(org.timezone)}T00:00:00Z`);
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, room_id, room_type_id, check_in_date, check_out_date, status, rate_per_night, guests(full_name)")
    .eq("property_id", org.propertyId)
    .in("status", ["confirmed", "checked_in"])
    .lte("check_in_date", dates[dates.length - 1])
    .gte("check_out_date", dates[0]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Room Calendar"]} />
      <h1 className="text-xl text-gray-900">Room Rack</h1>
      <p className="-mt-4 text-sm text-gray-500">
        14-day room rack. Drag a booking bar onto a different room or date to move it — dropping onto a different
        room type re-rates it as an upgrade/downgrade. Click a bar to open the reservation.
      </p>

      <div className="flex flex-wrap gap-2">
        {floors.map((f) => (
          <a
            key={f}
            href={`/live/room-calendar?floor=${encodeURIComponent(f)}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              f === activeFloor ? "border-accent/40 bg-accent-soft text-accent" : "border-gray-300 text-gray-600"
            }`}
          >
            Floor {f}
          </a>
        ))}
      </div>

      <Card>
        {!floorRooms.length ? (
          <EmptyState>No rooms on this floor.</EmptyState>
        ) : (
          <RoomRackGrid rooms={floorRooms} reservations={reservations ?? []} dates={dates} currency={org.currency} />
        )}
      </Card>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-purple-300 bg-purple-100" /> Confirmed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-accent/40 bg-accent-soft" /> Checked in
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-red-50" /> Maintenance / out of order (not droppable)
        </div>
      </div>
    </div>
  );
}
