import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, EmptyState, Input, Label, Select, StatTile } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createBuilding, createFloor, createRestaurant, updatePropertySettings, updateWorkingHours } from "@/app/actions/property";
import { CURRENCIES } from "@/lib/currencies";
import { TIMEZONES } from "@/lib/timezones";
import { DAYS, parseWorkingHours } from "@/lib/working-hours";
import { RestaurantActiveToggle, PropertyActiveToggle } from "./property-actions";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: property } = await supabase
    .from("properties")
    .select("id, name, code, city, address, gstin, currency, timezone, working_hours, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!property) notFound();

  const workingHours = parseWorkingHours(property.working_hours);

  const [{ data: buildings }, { data: restaurants }, { data: rooms }, { data: roomTypes }] = await Promise.all([
    supabase.from("buildings").select("id, name, floors(id, name, sort_order)").eq("property_id", id).order("name"),
    supabase.from("restaurants").select("id, name, description, is_active").eq("property_id", id).order("name"),
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", id),
    supabase.from("room_types").select("id", { count: "exact", head: true }).eq("property_id", id),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, "Properties", property.name]} />
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{property.name}</h1>
            <Badge color={property.is_active ? "green" : "gray"}>{property.is_active ? "Active" : "Inactive"}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {property.code} · {property.city ?? "No city set"}
            {property.gstin ? ` · GSTIN ${property.gstin}` : ""}
          </p>
        </div>
        <PropertyActiveToggle propertyId={property.id} isActive={property.is_active} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Buildings" value={buildings?.length ?? 0} />
        <StatTile label="Room Types" value={roomTypes?.length ?? 0} />
        <StatTile label="Rooms" value={rooms?.length ?? 0} />
        <StatTile label="Restaurants" value={restaurants?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Buildings & floors" />
          {!buildings?.length ? (
            <EmptyState>No buildings yet.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {buildings.map((b) => (
                <div key={b.id} className="px-5 py-3">
                  <div className="text-sm font-medium text-gray-900">{b.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[...b.floors]
                      .sort((a, c) => a.sort_order - c.sort_order)
                      .map((f) => (
                        <span key={f.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {f.name}
                        </span>
                      ))}
                    {!b.floors.length && <span className="text-xs text-gray-400">No floors yet</span>}
                  </div>
                  <form action={createFloor.bind(null, b.id, property.id)} className="mt-2 flex items-end gap-2">
                    <Input name="name" placeholder="Floor name, e.g. 3" required className="h-7 w-32 text-xs" />
                    <Input name="sort_order" type="number" placeholder="Order" className="h-7 w-20 text-xs" />
                    <button type="submit" className="text-xs text-accent hover:underline">
                      Add floor
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
          <form action={createBuilding.bind(null, property.id)} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
            <div className="flex-1">
              <Label>New building</Label>
              <Input name="name" required placeholder="e.g. Tower B" />
            </div>
            <SubmitButton variant="secondary">Add building</SubmitButton>
          </form>
        </Card>

        <Card>
          <CardHeader title="Restaurant outlets" />
          {!restaurants?.length ? (
            <EmptyState>No restaurants yet.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {restaurants.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <div>
                    <div className="text-gray-800">{r.name}</div>
                    {r.description && <div className="text-xs text-gray-400">{r.description}</div>}
                  </div>
                  <RestaurantActiveToggle restaurantId={r.id} propertyId={property.id} isActive={r.is_active} />
                </div>
              ))}
            </div>
          )}
          <form action={createRestaurant.bind(null, property.id)} className="space-y-2 border-t border-gray-100 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Rooftop Grill" />
            </div>
            <div>
              <Label>Description</Label>
              <Input name="description" placeholder="Cuisine / concept" />
            </div>
            <SubmitButton variant="secondary">Add restaurant</SubmitButton>
          </form>
        </Card>

        <Card>
          <CardHeader title="Property settings" />
          <form action={updatePropertySettings.bind(null, property.id)} className="space-y-2 px-5 py-4">
            <div>
              <Label>Currency</Label>
              <Select name="currency" defaultValue={property.currency}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Timezone</Label>
              <Select name="timezone" defaultValue={property.timezone}>
                {TIMEZONES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <SubmitButton variant="secondary">Save</SubmitButton>
          </form>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Working hours" />
          <p className="px-5 pt-3 text-xs text-gray-500">
            Gates restaurant order creation — orders can&apos;t be started outside these hours. Defaults to open
            24 hours every day, so nothing is restricted until you narrow it.
          </p>
          <form action={updateWorkingHours.bind(null, property.id)} className="space-y-2 px-5 py-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {DAYS.map((day) => {
                const h = workingHours[day];
                return (
                  <div key={day} className="flex items-center gap-3 rounded-md border border-gray-100 px-3 py-2">
                    <span className="w-24 shrink-0 text-sm capitalize text-gray-700">{day}</span>
                    <Input name={`${day}_open`} type="time" defaultValue={h.open} className="w-28" />
                    <span className="text-xs text-gray-400">to</span>
                    <Input name={`${day}_close`} type="time" defaultValue={h.close} className="w-28" />
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
                      <input type="checkbox" name={`${day}_closed`} defaultChecked={h.closed} /> Closed
                    </label>
                  </div>
                );
              })}
            </div>
            <SubmitButton variant="secondary">Save working hours</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
