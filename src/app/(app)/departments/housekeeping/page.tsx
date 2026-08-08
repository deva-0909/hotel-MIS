import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, StatTile, EmptyState, Input } from "@/components/ui";
import { assignAttendant } from "@/app/actions/housekeeping";
import { RoomStatusButtons } from "./housekeeping-actions";

export default async function HousekeepingDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: rooms }, { data: tasks }] = await Promise.all([
    supabase.from("rooms").select("id, room_number, status").order("room_number"),
    supabase.from("housekeeping_tasks").select("room_id, status, attendant, priority"),
  ]);

  const taskByRoom = new Map((tasks ?? []).map((t) => [t.room_id, t]));
  const clean = rooms?.filter((r) => r.status !== "dirty" && r.status !== "maintenance" && r.status !== "out_of_order").length ?? 0;
  const dirty = rooms?.filter((r) => r.status === "dirty").length ?? 0;
  const inspecting = tasks?.filter((t) => t.status === "inspecting").length ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Housekeeping"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          HK
        </span>
        <h1 className="text-xl text-gray-900">Housekeeping</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Rooms Clean" value={clean} sub={`of ${rooms?.length ?? 0}`} />
        <StatTile label="Dirty / Pending" value={dirty} />
        <StatTile label="Inspecting" value={inspecting} />
        <StatTile label="Total Rooms" value={rooms?.length ?? 0} />
      </div>

      <Card>
        <CardHeader title="Room status board" />
        {!rooms?.length ? (
          <EmptyState>No rooms yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Room</th>
                <th className="px-5 py-2 font-medium">Attendant</th>
                <th className="px-5 py-2 font-medium">Priority</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const task = taskByRoom.get(room.id);
                return (
                  <tr key={room.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{room.room_number}</td>
                    <td className="px-5 py-2.5">
                      <form action={assignAttendant} className="flex items-center gap-1">
                        <input type="hidden" name="room_id" value={room.id} />
                        <Input name="attendant" defaultValue={task?.attendant ?? ""} placeholder="Unassigned" className="h-7 text-xs" />
                        <input type="hidden" name="priority" value={task?.priority ?? ""} />
                        <button type="submit" className="text-xs text-accent hover:underline">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{task?.priority ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <RoomStatusButtons roomId={room.id} status={task?.status ?? "clean"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
