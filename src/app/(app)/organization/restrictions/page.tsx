import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createRestriction } from "@/app/actions/restrictions";
import { DeleteRestrictionButton } from "./restriction-actions";

export default async function RestrictionsPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: restrictions }, { data: roomTypes }] = await Promise.all([
    supabase
      .from("availability_restrictions")
      .select("id, start_date, end_date, min_stay, max_stay, closed_to_arrival, closed_to_departure, stop_sell, notes, room_types(name)")
      .eq("property_id", org.propertyId)
      .order("start_date", { ascending: false }),
    supabase.from("room_types").select("id, name").eq("property_id", org.propertyId).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Restrictions"]} />
      <h1 className="text-xl text-gray-900">Availability Restrictions</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Minimum/maximum stay, stop-sell, and closed-to-arrival/departure — enforced on every booking (internal and
        channel) for the date range it covers. Rows tagged from an iCal import are managed automatically; remove them
        by disconnecting or re-importing that channel rather than deleting here.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Restrictions (${restrictions?.length ?? 0})`} />
          {!restrictions?.length ? (
            <EmptyState>No restrictions set — every room type is fully open.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Room type</th>
                  <th className="px-3 py-2 font-medium">Dates</th>
                  <th className="px-3 py-2 font-medium">Rules</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {restrictions.map((r) => {
                  const isImported = r.notes?.startsWith("ical-import:");
                  return (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2 font-medium text-gray-900">{r.room_types?.name}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.start_date} → {r.end_date}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {r.stop_sell && <Badge color="red">Stop sell</Badge>}
                          {r.min_stay && <Badge color="blue">Min {r.min_stay}n</Badge>}
                          {r.max_stay && <Badge color="blue">Max {r.max_stay}n</Badge>}
                          {r.closed_to_arrival && <Badge color="amber">No arrival</Badge>}
                          {r.closed_to_departure && <Badge color="amber">No departure</Badge>}
                          {isImported && <Badge color="gray">iCal import</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">{!isImported && <DeleteRestrictionButton restrictionId={r.id} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add restriction" />
          <form action={createRestriction} className="space-y-2 px-5 py-4">
            <div>
              <Label>Room type</Label>
              <Select name="room_type_id" required>
                {roomTypes?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start date</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div>
                <Label>End date</Label>
                <Input name="end_date" type="date" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Min stay (nights)</Label>
                <Input name="min_stay" type="number" min={1} />
              </div>
              <div>
                <Label>Max stay (nights)</Label>
                <Input name="max_stay" type="number" min={1} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="stop_sell" /> Stop sell (block entirely)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="closed_to_arrival" /> Closed to arrival
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="closed_to_departure" /> Closed to departure
            </label>
            <div>
              <Label>Notes</Label>
              <Input name="notes" />
            </div>
            <SubmitButton variant="secondary">Add restriction</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
