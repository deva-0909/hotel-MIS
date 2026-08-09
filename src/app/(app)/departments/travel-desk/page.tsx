import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, StatTile, EmptyState, Input, Select, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createTravelBooking } from "@/app/actions/travel-desk";
import { TravelStatusControl } from "./travel-actions";

export default async function TravelDeskDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: bookings }, { data: vehicles }, { data: guests }, { data: todayBookings }] = await Promise.all([
    supabase
      .from("travel_bookings")
      .select("id, service_type, vendor, scheduled_at, status, walk_in_name, guests(full_name), travel_vehicles(name)")
      .eq("property_id", org.propertyId)
      .order("scheduled_at", { ascending: false })
      .limit(15),
    supabase.from("travel_vehicles").select("id, name, status").eq("property_id", org.propertyId),
    supabase.from("guests").select("id, full_name").order("full_name").limit(200),
    supabase
      .from("travel_bookings")
      .select("id")
      .eq("property_id", org.propertyId)
      .gte("scheduled_at", `${today}T00:00:00Z`)
      .lte("scheduled_at", `${today}T23:59:59Z`),
  ]);

  const available = vehicles?.filter((v) => v.status === "available").length ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Travel Desk"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          TD
        </span>
        <h1 className="text-xl text-gray-900">Travel Desk</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Bookings Today" value={todayBookings?.length ?? 0} />
        <StatTile label="Vehicles Available" value={`${available} / ${vehicles?.length ?? 0}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Bookings" />
          {!bookings?.length ? (
            <EmptyState>No bookings yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Guest</th>
                  <th className="px-5 py-2 font-medium">Service</th>
                  <th className="px-5 py-2 font-medium">Vendor / Vehicle</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-800">{b.guests?.full_name ?? b.walk_in_name ?? "Walk-in"}</td>
                    <td className="px-5 py-2.5 text-gray-600">{b.service_type.replace(/_/g, " ")}</td>
                    <td className="px-5 py-2.5 text-gray-600">{b.travel_vehicles?.name ?? b.vendor ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <TravelStatusControl bookingId={b.id} status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="New booking" />
          <form action={createTravelBooking} className="space-y-2 p-4">
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
              <Select name="service_type" required defaultValue="airport_pickup">
                <option value="airport_pickup">Airport Pickup</option>
                <option value="airport_drop">Airport Drop</option>
                <option value="city_tour">City Tour</option>
                <option value="package">Tour Package</option>
              </Select>
            </div>
            <div>
              <Label>Vehicle</Label>
              <Select name="vehicle_id">
                <option value="">Unassigned / partner vendor</option>
                {vehicles?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Vendor (if not own fleet)</Label>
              <Input name="vendor" placeholder="e.g. Local Partner" />
            </div>
            <div>
              <Label>Date &amp; time</Label>
              <Input name="scheduled_at" type="datetime-local" />
            </div>
            <SubmitButton>Create booking</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
