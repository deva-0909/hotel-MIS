import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, Breadcrumb, EmptyState } from "@/components/ui";

const DAYS = 14;

function cellCode(
  date: string,
  room: { status: string },
  reservations: { check_in_date: string; check_out_date: string; status: string }[],
) {
  if (room.status === "out_of_order" || room.status === "maintenance") return "X";

  // Departure day is checked separately: a stay's check_out_date is excluded
  // from its own "covering" range below, so without this branch a guest
  // leaving today would render as merely "Vacant" instead of "Departure".
  const departing = reservations.find((r) => r.check_out_date === date && r.status === "checked_in");
  if (departing) return "D";

  const covering = reservations.find(
    (r) => date >= r.check_in_date && date < r.check_out_date && (r.status === "confirmed" || r.status === "checked_in"),
  );
  if (!covering) return "V";
  if (covering.check_in_date === date) return "A";
  return "O";
}

const CODE_LABEL: Record<string, string> = { O: "Occupied", V: "Vacant", A: "Arrival", D: "Departure", X: "Out of order" };
const CODE_STYLE: Record<string, string> = {
  O: "bg-accent-soft text-accent",
  V: "bg-gray-50 text-gray-400",
  A: "bg-emerald-50 text-emerald-700",
  D: "bg-blue-50 text-blue-700",
  X: "bg-red-50 text-red-600",
};

export default async function RoomCalendarPage({ searchParams }: { searchParams: Promise<{ floor?: string }> }) {
  const { floor } = await searchParams;
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, room_number, status, floors(name)")
    .eq("property_id", org.propertyId)
    .order("room_number");
  const floors = Array.from(new Set((rooms ?? []).map((r) => r.floors?.name).filter(Boolean))) as string[];
  const activeFloor = floor && floors.includes(floor) ? floor : floors[0];
  const floorRooms = rooms?.filter((r) => r.floors?.name === activeFloor) ?? [];

  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const { data: reservations } = await supabase
    .from("reservations")
    .select("room_id, check_in_date, check_out_date, status")
    .eq("property_id", org.propertyId)
    .in("status", ["confirmed", "checked_in"])
    .lte("check_in_date", dates[dates.length - 1])
    .gte("check_out_date", dates[0]);

  const reservationsByRoom = new Map<string, typeof reservations>();
  for (const r of reservations ?? []) {
    if (!r.room_id) continue;
    reservationsByRoom.set(r.room_id, [...(reservationsByRoom.get(r.room_id) ?? []), r]);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Room Calendar"]} />
      <h1 className="text-xl text-gray-900">Room Availability Calendar</h1>
      <p className="-mt-4 text-sm text-gray-500">14-day room-level view, filtered by floor.</p>

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

      <Card className="overflow-x-auto">
        {!floorRooms.length ? (
          <EmptyState>No rooms on this floor.</EmptyState>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/10 text-left uppercase text-gray-400">
                <th className="whitespace-nowrap px-3 py-2 font-medium">Room</th>
                {dates.map((d) => (
                  <th key={d} className="whitespace-nowrap px-2 py-2 text-center font-medium">
                    {new Date(d).toLocaleDateString([], { day: "2-digit", month: "short" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {floorRooms.map((room) => (
                <tr key={room.id} className="border-b border-gray-50 last:border-0">
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium text-gray-800">{room.room_number}</td>
                  {dates.map((d) => {
                    const code = cellCode(d, room, reservationsByRoom.get(room.id) ?? []);
                    return (
                      <td key={d} className="px-1 py-1 text-center">
                        <span
                          title={CODE_LABEL[code]}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded ${CODE_STYLE[code]}`}
                        >
                          {code}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {Object.entries(CODE_LABEL).map(([code, label]) => (
          <div key={code} className="flex items-center gap-1.5">
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${CODE_STYLE[code]}`}>{code}</span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
