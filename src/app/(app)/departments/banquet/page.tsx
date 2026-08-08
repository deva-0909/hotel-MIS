import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, StatTile, EmptyState, Input, Select, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createEvent } from "@/app/actions/banquet";
import { EventStatusControl } from "./banquet-actions";

export default async function BanquetDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [{ data: events }, { data: venues }, { data: weekEvents }] = await Promise.all([
    supabase
      .from("banquet_events")
      .select("id, event_name, client_name, covers, event_date, status, value_amount, banquet_venues(name)")
      .order("event_date", { ascending: true }),
    supabase.from("banquet_venues").select("id, name, capacity"),
    supabase
      .from("banquet_events")
      .select("id, covers")
      .gte("event_date", new Date().toISOString().slice(0, 10))
      .lte("event_date", weekAhead.toISOString().slice(0, 10)),
  ]);

  const coversThisWeek = weekEvents?.reduce((sum, e) => sum + e.covers, 0) ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Banquet & Events"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          BQ
        </span>
        <h1 className="text-xl text-gray-900">Banquet &amp; Events</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Events This Week" value={weekEvents?.length ?? 0} />
        <StatTile label="Confirmed Covers" value={coversThisWeek} />
        <StatTile label="Venues" value={venues?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Event bookings" />
          {!events?.length ? (
            <EmptyState>No events booked yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Event</th>
                  <th className="px-5 py-2 font-medium">Client</th>
                  <th className="px-5 py-2 font-medium">Venue</th>
                  <th className="px-5 py-2 font-medium">Covers</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{e.event_name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{e.client_name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{e.banquet_venues?.name ?? "—"}</td>
                    <td className="px-5 py-2.5 text-gray-600">{e.covers}</td>
                    <td className="px-5 py-2.5 text-gray-600">{e.event_date}</td>
                    <td className="px-5 py-2.5">
                      <EventStatusControl eventId={e.id} status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="New event booking" />
          <form action={createEvent} className="space-y-2 p-4">
            <div>
              <Label>Event name</Label>
              <Input name="event_name" required />
            </div>
            <div>
              <Label>Client</Label>
              <Input name="client_name" required />
            </div>
            <div>
              <Label>Venue</Label>
              <Select name="venue_id">
                <option value="">Select venue…</option>
                {venues?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} (cap. {v.capacity})
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Covers</Label>
                <Input name="covers" type="number" min={0} />
              </div>
              <div>
                <Label>Date</Label>
                <Input name="event_date" type="date" required />
              </div>
            </div>
            <div>
              <Label>Value (₹)</Label>
              <Input name="value_amount" type="number" min={0} step="0.01" />
            </div>
            <SubmitButton>Book event</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
