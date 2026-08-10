import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, Input, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createStore } from "@/app/actions/stores";
import { StoreActiveToggle } from "./store-actions";

export default async function StoresPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: stores }, { data: stockRows }] = await Promise.all([
    supabase.from("stores").select("id, name, is_default, is_active").eq("property_id", org.propertyId).order("name"),
    supabase.from("store_inventory").select("store_id, current_stock, stores!inner(property_id)").eq("stores.property_id", org.propertyId),
  ]);

  const itemCountByStore = new Map<string, number>();
  for (const row of stockRows ?? []) {
    itemCountByStore.set(row.store_id, (itemCountByStore.get(row.store_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Stores"]} />
      <h1 className="text-xl text-gray-900">Stores & Warehouses</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Every property starts with a single Main Store, which all existing stock and stock movements live in. Add
        more stores (e.g. Bar Store, Housekeeping Store) to track stock separately per location — pick a store when
        recording a stock movement on the Stock Items page.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Stores (${stores?.length ?? 0})`} />
          {!stores?.length ? (
            <EmptyState>No stores yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Items stocked</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2 font-medium text-gray-900">
                      <span className="flex items-center gap-2">
                        {s.name}
                        {s.is_default && <Badge color="gold">Default</Badge>}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{itemCountByStore.get(s.id) ?? 0}</td>
                    <td className="px-3 py-2">
                      <StoreActiveToggle storeId={s.id} isActive={s.is_active} isDefault={s.is_default} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add store" />
          <form action={createStore} className="space-y-2 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Bar Store" />
            </div>
            <SubmitButton variant="secondary">Add store</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
