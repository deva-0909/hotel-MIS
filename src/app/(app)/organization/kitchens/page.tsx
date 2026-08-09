import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { createKitchen, linkKitchenProperty } from "@/app/actions/kitchens";
import { Card, CardHeader, Badge, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { UnlinkPropertyButton } from "./kitchen-actions";

export default async function KitchensPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: kitchens }, { data: properties }, { data: links }, { data: categories }] = await Promise.all([
    supabase.from("kitchens").select("id, name, is_central").order("name"),
    supabase.from("properties").select("id, name").order("name"),
    supabase.from("kitchen_properties").select("kitchen_id, property_id, properties(name)"),
    supabase.from("menu_categories").select("id, kitchen_id").not("kitchen_id", "is", null),
  ]);

  const linksByKitchen = new Map<string, { property_id: string; name: string }[]>();
  for (const link of links ?? []) {
    const list = linksByKitchen.get(link.kitchen_id) ?? [];
    list.push({ property_id: link.property_id, name: link.properties?.name ?? "—" });
    linksByKitchen.set(link.kitchen_id, list);
  }

  const categoryCountByKitchen = new Map<string, number>();
  for (const c of categories ?? []) {
    if (!c.kitchen_id) continue;
    categoryCountByKitchen.set(c.kitchen_id, (categoryCountByKitchen.get(c.kitchen_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, "Kitchens"]} />
      <h1 className="text-xl text-gray-900">Kitchens</h1>
      <p className="-mt-4 text-sm text-gray-500">
        A kitchen prepares tickets for whichever menu categories point at it (set in Menu Management). Central
        kitchens can serve restaurants at more than one property — link every property it cooks for below, and
        kitchen staff at any of those properties will see its tickets.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!kitchens?.length ? (
            <Card>
              <EmptyState>No kitchens yet — add one to start routing tickets across properties.</EmptyState>
            </Card>
          ) : (
            kitchens.map((k) => {
              const linkedProperties = linksByKitchen.get(k.id) ?? [];
              const linkedIds = new Set(linkedProperties.map((p) => p.property_id));
              const available = (properties ?? []).filter((p) => !linkedIds.has(p.id));
              return (
                <Card key={k.id}>
                  <CardHeader
                    title={
                      <span className="flex items-center gap-2">
                        {k.name}
                        {k.is_central && <Badge color="gold">Central</Badge>}
                      </span>
                    }
                    action={
                      <span className="text-xs text-gray-400">
                        {categoryCountByKitchen.get(k.id) ?? 0} categories routed here
                      </span>
                    }
                  />
                  <div className="px-5 py-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                      Serves properties
                    </div>
                    {!linkedProperties.length ? (
                      <p className="text-sm text-gray-400">Not linked to any property yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {linkedProperties.map((p) => (
                          <span
                            key={p.property_id}
                            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                          >
                            {p.name}
                            <UnlinkPropertyButton kitchenId={k.id} propertyId={p.property_id} />
                          </span>
                        ))}
                      </div>
                    )}
                    {available.length > 0 && (
                      <form action={linkKitchenProperty.bind(null, k.id)} className="mt-3 flex items-end gap-2">
                        <Select name="property_id" required className="max-w-xs">
                          <option value="">Add property…</option>
                          {available.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Select>
                        <button type="submit" className="text-xs text-accent hover:underline">
                          Link
                        </button>
                      </form>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <Card>
          <CardHeader title="Add kitchen" />
          <form action={createKitchen} className="space-y-2 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Central Commissary" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="is_central" /> Central kitchen (serves multiple properties)
            </label>
            <SubmitButton>Add kitchen</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
