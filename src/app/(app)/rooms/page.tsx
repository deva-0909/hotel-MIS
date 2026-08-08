import { createClient } from "@/lib/supabase/server";
import { createRoom, createRoomType } from "@/app/actions/hotel";
import { Card, CardHeader, Badge, Input, Select, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { RoomStatusControl } from "@/components/room-status-control";

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple"> = {
  available: "green",
  occupied: "blue",
  reserved: "purple",
  dirty: "amber",
  maintenance: "red",
  out_of_order: "gray",
};

export default async function RoomsPage() {
  const supabase = await createClient();
  const [{ data: rooms }, { data: roomTypes }] = await Promise.all([
    supabase.from("rooms").select("id, room_number, floor, status, room_types(name, base_rate)").order("room_number"),
    supabase.from("room_types").select("id, name, base_rate, max_occupancy").order("base_rate"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Rooms</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`All rooms (${rooms?.length ?? 0})`} />
          {!rooms?.length ? (
            <EmptyState>No rooms yet. Add a room type, then a room.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Room</th>
                  <th className="px-5 py-2 font-medium">Type</th>
                  <th className="px-5 py-2 font-medium">Floor</th>
                  <th className="px-5 py-2 font-medium">Rate</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{room.room_number}</td>
                    <td className="px-5 py-2.5 text-gray-600">{room.room_types?.name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{room.floor ?? "—"}</td>
                    <td className="px-5 py-2.5 text-gray-600">₹{room.room_types?.base_rate}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge color={STATUS_COLOR[room.status]}>{room.status.replace(/_/g, " ")}</Badge>
                        <RoomStatusControl roomId={room.id} status={room.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Room types" />
            <div className="divide-y divide-gray-50">
              {roomTypes?.map((rt) => (
                <div key={rt.id} className="flex items-center justify-between px-5 py-2 text-sm">
                  <span className="text-gray-700">{rt.name}</span>
                  <span className="text-gray-500">₹{rt.base_rate}/night</span>
                </div>
              ))}
              {!roomTypes?.length && <EmptyState>No room types yet.</EmptyState>}
            </div>
            <form action={createRoomType} className="space-y-2 border-t border-gray-100 px-5 py-4">
              <div>
                <Label>Name</Label>
                <Input name="name" required placeholder="e.g. Deluxe" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Base rate</Label>
                  <Input name="base_rate" type="number" min={0} step="0.01" required />
                </div>
                <div>
                  <Label>Max occupancy</Label>
                  <Input name="max_occupancy" type="number" min={1} defaultValue={2} />
                </div>
              </div>
              <div>
                <Label>Amenities</Label>
                <Input name="amenities" placeholder="AC, TV, Wi-Fi" />
              </div>
              <SubmitButton>Add room type</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Add room" />
            <form action={createRoom} className="space-y-2 px-5 py-4">
              <div>
                <Label>Room number</Label>
                <Input name="room_number" required placeholder="e.g. 104" />
              </div>
              <div>
                <Label>Room type</Label>
                <Select name="room_type_id" required>
                  <option value="">Select type…</option>
                  {roomTypes?.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Floor</Label>
                <Input name="floor" placeholder="e.g. 1" />
              </div>
              <SubmitButton>Add room</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
