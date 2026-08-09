import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { createRoom, createRoomType } from "@/app/actions/hotel";
import { adoptRoomTypeTemplate } from "@/app/actions/templates";
import { Card, CardHeader, Badge, Breadcrumb, Input, Select, Label, EmptyState } from "@/components/ui";
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
  const org = await getOrgContext();

  const [{ data: rooms }, { data: roomTypes }, { data: buildings }, { data: roomTypeTemplates }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, room_number, status, room_types(name, base_rate), floors(name, buildings(name))")
      .eq("property_id", org.propertyId)
      .order("room_number"),
    supabase.from("room_types").select("id, name, base_rate, max_occupancy").eq("property_id", org.propertyId).order("base_rate"),
    supabase.from("buildings").select("id, name, floors(id, name)").eq("property_id", org.propertyId).order("name"),
    supabase.from("corporate_room_type_templates").select("id, name, base_rate").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Rooms"]} />
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
                  <th className="px-5 py-2 font-medium">Building / Floor</th>
                  <th className="px-5 py-2 font-medium">Rate</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{room.room_number}</td>
                    <td className="px-5 py-2.5 text-gray-600">{room.room_types?.name}</td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {room.floors?.buildings?.name} / {room.floors?.name}
                    </td>
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
            {roomTypeTemplates && roomTypeTemplates.length > 0 && (
              <form action={adoptRoomTypeTemplate} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
                <div className="flex-1">
                  <Label>Or adopt a corporate template</Label>
                  <Select name="template_id" required>
                    <option value="">Select template…</option>
                    {roomTypeTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — ₹{t.base_rate}
                      </option>
                    ))}
                  </Select>
                </div>
                <SubmitButton variant="secondary">Adopt</SubmitButton>
              </form>
            )}
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
                <Select name="floor_id" required>
                  <option value="">Select floor…</option>
                  {buildings?.map((b) => (
                    <optgroup key={b.id} label={b.name}>
                      {b.floors.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </div>
              <SubmitButton>Add room</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
