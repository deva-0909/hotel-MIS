import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { addEventMenuItem } from "@/app/actions/banquet";
import { Card, CardHeader, Badge, Breadcrumb, EmptyState, Select, Input, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { EVENT_STATUS_COLOR } from "@/lib/status-colors";
import { EventStatusControl } from "../banquet-actions";
import { RemoveMenuItemButton, PrintBeoButton } from "./beo-actions";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function BanquetEventOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: event } = await supabase
    .from("banquet_events")
    .select(
      "id, event_name, client_name, covers, start_at, end_at, status, value_amount, banquet_venues(name, capacity, buffer_minutes)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  const [{ data: items }, { data: packages }] = await Promise.all([
    supabase
      .from("banquet_event_items")
      .select("id, covers, notes, banquet_menu_packages(id, name, price_per_cover)")
      .eq("event_id", id),
    supabase.from("banquet_menu_packages").select("id, name, price_per_cover").eq("property_id", org.propertyId).order("name"),
  ]);

  const foodCost = items?.reduce((sum, i) => sum + i.covers * (i.banquet_menu_packages?.price_per_cover ?? 0), 0) ?? 0;
  const coversOrdered = items?.reduce((sum, i) => sum + i.covers, 0) ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Banquet & Events", event.event_name]} />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{event.event_name}</h1>
            <Badge color={EVENT_STATUS_COLOR[event.status] ?? "gray"}>{event.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">Banquet Event Order (BEO)</p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <EventStatusControl eventId={event.id} status={event.status} />
          <PrintBeoButton />
        </div>
      </div>

      <Card>
        <CardHeader title="Event details" />
        <div className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase text-gray-400">Client</div>
            <div className="mt-0.5 text-gray-900">{event.client_name}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Venue</div>
            <div className="mt-0.5 text-gray-900">{event.banquet_venues?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Booked covers</div>
            <div className="mt-0.5 text-gray-900">{event.covers}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Starts</div>
            <div className="mt-0.5 text-gray-900">{formatDateTime(event.start_at)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Ends</div>
            <div className="mt-0.5 text-gray-900">{formatDateTime(event.end_at)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Setup/teardown buffer</div>
            <div className="mt-0.5 text-gray-900">{event.banquet_venues?.buffer_minutes ?? 0} min each side</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Contracted value</div>
            <div className="mt-0.5 text-gray-900">₹{event.value_amount}</div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Food & beverage — ${coversOrdered} covers ordered, ₹${foodCost.toFixed(2)}`} />
        {!items?.length ? (
          <EmptyState>No packages selected yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Package</th>
                <th className="px-5 py-2 font-medium">Covers</th>
                <th className="px-5 py-2 font-medium">Price / cover</th>
                <th className="px-5 py-2 font-medium">Subtotal</th>
                <th className="px-5 py-2 font-medium">Notes</th>
                <th className="px-5 py-2 font-medium print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 font-medium text-gray-900">{item.banquet_menu_packages?.name}</td>
                  <td className="px-5 py-2.5 text-gray-600">{item.covers}</td>
                  <td className="px-5 py-2.5 text-gray-600">₹{item.banquet_menu_packages?.price_per_cover}</td>
                  <td className="px-5 py-2.5 text-gray-600">
                    ₹{(item.covers * (item.banquet_menu_packages?.price_per_cover ?? 0)).toFixed(2)}
                  </td>
                  <td className="px-5 py-2.5 text-gray-600">{item.notes ?? "—"}</td>
                  <td className="px-5 py-2.5 print:hidden">
                    <RemoveMenuItemButton eventId={event.id} itemId={item.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form
          action={addEventMenuItem.bind(null, event.id)}
          className="flex flex-wrap items-end gap-2 border-t border-gray-100 px-5 py-4 print:hidden"
        >
          <div className="flex-1">
            <Label>Package</Label>
            <Select name="package_id" required>
              <option value="">Select package…</option>
              {packages?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{p.price_per_cover}/cover)
                </option>
              ))}
            </Select>
          </div>
          <div className="w-28">
            <Label>Covers</Label>
            <Input name="covers" type="number" min={0} required />
          </div>
          <div className="flex-1">
            <Label>Notes</Label>
            <Input name="notes" placeholder="e.g. Jain thali for 20" />
          </div>
          <SubmitButton variant="secondary">Add package</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
