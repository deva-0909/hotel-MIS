import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, EmptyState } from "@/components/ui";
import { AddDeviceForm } from "./add-device-form";
import { DeviceActiveToggle, DeleteDeviceButton } from "./device-actions";

const TYPE_LABEL: Record<string, string> = { printer: "Printer", kds: "KDS" };

export default async function DevicesPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: devices }, { data: restaurants }, { data: kitchenLinks }] = await Promise.all([
    supabase
      .from("devices")
      .select(
        "id, device_type, name, identifier, is_active, restaurants(name), kitchens(name), service_areas(name)",
      )
      .eq("property_id", org.propertyId)
      .order("device_type")
      .order("name"),
    supabase.from("restaurants").select("id, name, service_areas(id, name, restaurant_id)").eq("property_id", org.propertyId).order("name"),
    supabase.from("kitchen_properties").select("kitchens(id, name)").eq("property_id", org.propertyId),
  ]);

  const serviceAreas = (restaurants ?? []).flatMap((r) => r.service_areas ?? []);
  const kitchens = (kitchenLinks ?? []).flatMap((l) => (l.kitchens ? [l.kitchens] : []));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Devices"]} />
      <h1 className="text-xl text-gray-900">Printers & KDS Devices</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Register the physical (or virtual) printers and kitchen display stations at this property, and map each one
        to the restaurant, service area, or kitchen it serves.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Devices (${devices?.length ?? 0})`} />
          {!devices?.length ? (
            <EmptyState>No devices registered yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Mapped to</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => {
                  const mapping =
                    d.device_type === "kds"
                      ? (d.kitchens?.name ?? "—")
                      : [d.restaurants?.name, d.service_areas?.name].filter(Boolean).join(" · ") || "—";
                  return (
                    <tr key={d.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2 font-medium text-gray-900">
                        {d.name}
                        {d.identifier && <div className="text-xs text-gray-400">{d.identifier}</div>}
                      </td>
                      <td className="px-3 py-2">
                        <Badge color="blue">{TYPE_LABEL[d.device_type] ?? d.device_type}</Badge>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{mapping}</td>
                      <td className="px-3 py-2">
                        <DeviceActiveToggle deviceId={d.id} isActive={d.is_active} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DeleteDeviceButton deviceId={d.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add device" />
          <AddDeviceForm
            restaurants={(restaurants ?? []).map((r) => ({ id: r.id, name: r.name }))}
            serviceAreas={serviceAreas}
            kitchens={kitchens}
          />
        </Card>
      </div>
    </div>
  );
}
