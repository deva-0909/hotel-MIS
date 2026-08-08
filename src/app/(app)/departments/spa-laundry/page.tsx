import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, StatTile, EmptyState, Input, Select, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createSpaBooking, createLaundryBatch } from "@/app/actions/spa-laundry";
import { SpaStatusControl, LaundryStatusControl } from "./spa-actions";

export default async function SpaLaundryDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: bookings }, { data: services }, { data: laundry }, { data: guests }, { data: rooms }] = await Promise.all([
    supabase
      .from("spa_bookings")
      .select("id, therapist, scheduled_at, status, walk_in_name, guests(full_name), spa_services(name)")
      .gte("scheduled_at", `${today}T00:00:00Z`)
      .lte("scheduled_at", `${today}T23:59:59Z`)
      .order("scheduled_at"),
    supabase.from("spa_services").select("id, name, price"),
    supabase.from("laundry_batches").select("id, item_count, status, rooms(room_number)").order("created_at", { ascending: false }).limit(10),
    supabase.from("guests").select("id, full_name").order("full_name").limit(200),
    supabase.from("rooms").select("id, room_number").order("room_number"),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Spa & Laundry"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          SL
        </span>
        <h1 className="text-xl text-gray-900">Spa &amp; Laundry</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Spa Bookings Today" value={bookings?.length ?? 0} />
        <StatTile label="Laundry Batches" value={laundry?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Today's spa schedule" />
            {!bookings?.length ? (
              <EmptyState>No spa bookings today.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                    <th className="px-5 py-2 font-medium">Time</th>
                    <th className="px-5 py-2 font-medium">Guest</th>
                    <th className="px-5 py-2 font-medium">Service</th>
                    <th className="px-5 py-2 font-medium">Therapist</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 text-gray-600">
                        {new Date(b.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-2.5 text-gray-800">{b.guests?.full_name ?? b.walk_in_name ?? "Walk-in"}</td>
                      <td className="px-5 py-2.5 text-gray-600">{b.spa_services?.name}</td>
                      <td className="px-5 py-2.5 text-gray-600">{b.therapist ?? "—"}</td>
                      <td className="px-5 py-2.5">
                        <SpaStatusControl bookingId={b.id} status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card>
            <CardHeader title="Laundry batches" />
            {!laundry?.length ? (
              <EmptyState>No laundry batches yet.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                    <th className="px-5 py-2 font-medium">Room</th>
                    <th className="px-5 py-2 font-medium">Items</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {laundry.map((l) => (
                    <tr key={l.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 text-gray-800">{l.rooms?.room_number ?? "—"}</td>
                      <td className="px-5 py-2.5 text-gray-600">{l.item_count}</td>
                      <td className="px-5 py-2.5">
                        <LaundryStatusControl batchId={l.id} status={l.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Book spa appointment" />
            <form action={createSpaBooking} className="space-y-2 p-4">
              <div>
                <Label>Guest</Label>
                <Select name="guest_id">
                  <option value="">Walk-in</option>
                  {guests?.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Walk-in name (if no guest selected)</Label>
                <Input name="walk_in_name" />
              </div>
              <div>
                <Label>Service</Label>
                <Select name="service_id" required>
                  <option value="">Select service…</option>
                  {services?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ₹{s.price}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Therapist</Label>
                <Input name="therapist" />
              </div>
              <div>
                <Label>Date &amp; time</Label>
                <Input name="scheduled_at" type="datetime-local" required />
              </div>
              <SubmitButton>Book appointment</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Log laundry batch" />
            <form action={createLaundryBatch} className="space-y-2 p-4">
              <div>
                <Label>Room</Label>
                <Select name="room_id">
                  <option value="">Guest laundry</option>
                  {rooms?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.room_number}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Item count</Label>
                <Input name="item_count" type="number" min={0} required />
              </div>
              <SubmitButton variant="secondary">Log batch</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
