import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { createTable } from "@/app/actions/restaurant";
import { createServiceArea } from "@/app/actions/kitchens";
import { Card, CardHeader, Badge, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray"> = {
  available: "green",
  occupied: "blue",
  reserved: "amber",
  cleaning: "gray",
};

export default async function TablesPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("property_id", org.propertyId)
    .order("name");
  const restaurantIds = (restaurants ?? []).map((r) => r.id);

  const [{ data: tables }, { data: serviceAreas }] = await Promise.all([
    restaurantIds.length
      ? supabase
          .from("restaurant_tables")
          .select("id, table_number, capacity, status, restaurant_id, restaurants(name), service_areas(name)")
          .in("restaurant_id", restaurantIds)
          .order("table_number")
      : Promise.resolve({ data: [] }),
    restaurantIds.length
      ? supabase.from("service_areas").select("id, name, restaurant_id, restaurants(name)").in("restaurant_id", restaurantIds).order("name")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Restaurant Tables"]} />
      <h1 className="text-xl text-gray-900">Restaurant tables</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          {!tables?.length ? (
            <EmptyState>No tables yet.</EmptyState>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {tables.map((t) => (
                <div key={t.id} className="rounded-lg border border-gray-200 p-3 text-center">
                  <div className="text-lg font-semibold text-gray-900">{t.table_number}</div>
                  <div className="text-xs text-gray-500">{t.capacity} seats</div>
                  <div className="text-xs text-gray-400">{t.restaurants?.name}</div>
                  {t.service_areas?.name && <div className="text-xs text-gray-400">{t.service_areas.name}</div>}
                  <div className="mt-2">
                    <Badge color={STATUS_COLOR[t.status]}>{t.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Add table" />
            <form action={createTable} className="space-y-2 px-5 py-4">
              <div>
                <Label>Restaurant</Label>
                <Select name="restaurant_id" required>
                  <option value="">Select restaurant…</option>
                  {restaurants?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Table number</Label>
                <Input name="table_number" required placeholder="e.g. T7" />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input name="capacity" type="number" min={1} defaultValue={4} />
              </div>
              <div>
                <Label>Service area (optional)</Label>
                <Select name="service_area_id" defaultValue="">
                  <option value="">None</option>
                  {serviceAreas?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.restaurants?.name})
                    </option>
                  ))}
                </Select>
              </div>
              <SubmitButton>Add table</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Add service area" />
            <form action={createServiceArea} className="space-y-2 px-5 py-4">
              <div>
                <Label>Restaurant</Label>
                <Select name="restaurant_id" required>
                  <option value="">Select restaurant…</option>
                  {restaurants?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Area name</Label>
                <Input name="name" required placeholder="e.g. Poolside" />
              </div>
              <SubmitButton variant="secondary">Add service area</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
