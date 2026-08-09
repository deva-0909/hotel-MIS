import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, StatTile, EmptyState, Input, Label, Select } from "@/components/ui";
import { formatMoney } from "@/lib/format-money";
import { SubmitButton } from "@/components/submit-button";
import { createVenue, createMenuPackage } from "@/app/actions/banquet";
import { adoptBanquetPackageTemplate } from "@/app/actions/templates";
import { EventStatusControl, NewEventForm } from "./banquet-actions";

function formatRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();
  const dateFmt: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  if (sameDay) {
    return `${start.toLocaleDateString([], dateFmt)}, ${start.toLocaleTimeString([], timeFmt)} – ${end.toLocaleTimeString([], timeFmt)}`;
  }
  return `${start.toLocaleDateString([], dateFmt)} ${start.toLocaleTimeString([], timeFmt)} – ${end.toLocaleDateString([], dateFmt)} ${end.toLocaleTimeString([], timeFmt)}`;
}

export default async function BanquetDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const now = new Date();
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [{ data: events }, { data: venues }, { data: weekEvents }, { data: packages }, { data: packageTemplates }] = await Promise.all([
    supabase
      .from("banquet_events")
      .select("id, event_name, client_name, covers, start_at, end_at, status, value_amount, banquet_venues(name)")
      .eq("property_id", org.propertyId)
      .order("start_at", { ascending: true }),
    supabase.from("banquet_venues").select("id, name, capacity, buffer_minutes").eq("property_id", org.propertyId).order("name"),
    supabase
      .from("banquet_events")
      .select("id, covers")
      .eq("property_id", org.propertyId)
      .neq("status", "cancelled")
      .gte("start_at", now.toISOString())
      .lte("start_at", weekAhead.toISOString()),
    supabase.from("banquet_menu_packages").select("id, name, description, price_per_cover").eq("property_id", org.propertyId).order("name"),
    supabase.from("corporate_banquet_package_templates").select("id, name, price_per_cover").order("name"),
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
        <StatTile label="F&B Packages" value={packages?.length ?? 0} />
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
                  <th className="px-5 py-2 font-medium">When</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">
                      <Link href={`/departments/banquet/${e.id}`} className="hover:text-accent hover:underline">
                        {e.event_name}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{e.client_name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{e.banquet_venues?.name ?? "—"}</td>
                    <td className="px-5 py-2.5 text-gray-600">{e.covers}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap text-gray-600">{formatRange(e.start_at, e.end_at)}</td>
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
          <NewEventForm venues={venues ?? []} currency={org.currency} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Venues" />
          {!venues?.length ? (
            <EmptyState>No venues yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Capacity</th>
                  <th className="px-5 py-2 font-medium">Setup/teardown buffer</th>
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{v.name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{v.capacity}</td>
                    <td className="px-5 py-2.5 text-gray-600">{v.buffer_minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form action={createVenue} className="space-y-2 border-t border-black/10 p-4">
            <div>
              <Label>Venue name</Label>
              <Input name="name" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Capacity</Label>
                <Input name="capacity" type="number" min={0} />
              </div>
              <div>
                <Label>Buffer (minutes)</Label>
                <Input name="buffer_minutes" type="number" min={0} defaultValue={60} />
              </div>
            </div>
            <SubmitButton variant="secondary">Add venue</SubmitButton>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="F&B package catalog" />
          {!packages?.length ? (
            <EmptyState>No menu packages yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Package</th>
                  <th className="px-5 py-2 font-medium">Description</th>
                  <th className="px-5 py-2 font-medium">Price / cover</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{p.description ?? "—"}</td>
                    <td className="px-5 py-2.5 text-gray-600">{formatMoney(p.price_per_cover, org.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form action={createMenuPackage} className="flex items-end gap-2 border-t border-black/10 p-4">
            <div className="flex-1">
              <Label>Package name</Label>
              <Input name="name" required placeholder="e.g. Rajasthani Thali" />
            </div>
            <div className="flex-[2]">
              <Label>Description</Label>
              <Input name="description" placeholder="What's included" />
            </div>
            <div className="w-32">
              <Label>Price / cover</Label>
              <Input name="price_per_cover" type="number" min={0} step="0.01" required />
            </div>
            <SubmitButton variant="secondary">Add package</SubmitButton>
          </form>
          {packageTemplates && packageTemplates.length > 0 && (
            <form action={adoptBanquetPackageTemplate} className="flex items-end gap-2 border-t border-black/10 p-4">
              <div className="flex-1">
                <Label>Or adopt a corporate template</Label>
                <Select name="template_id" required>
                  <option value="">Select template…</option>
                  {packageTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {formatMoney(t.price_per_cover, org.currency)}/cover
                    </option>
                  ))}
                </Select>
              </div>
              <SubmitButton variant="secondary">Adopt</SubmitButton>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
