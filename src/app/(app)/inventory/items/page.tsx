import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { createInventoryCategory, createInventoryItem, recordStockMovement } from "@/app/actions/inventory";
import { Card, CardHeader, Badge, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { formatMoney } from "@/lib/format-money";

export default async function InventoryItemsPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: categories }, { data: rawItems }] = await Promise.all([
    supabase.from("inventory_categories").select("id, name").order("name"),
    supabase
      .from("inventory_items")
      .select("id, name, unit, unit_cost, inventory_categories(name), property_inventory(current_stock, reorder_level)")
      .eq("property_inventory.property_id", org.propertyId)
      .order("name"),
  ]);

  // Catalog is shared across properties; stock is per-property (property_inventory
  // has at most one matching row, or none if this property has never stocked it).
  const items = (rawItems ?? []).map((i) => ({
    ...i,
    current_stock: i.property_inventory[0]?.current_stock ?? 0,
    reorder_level: i.property_inventory[0]?.reorder_level ?? 0,
  }));

  const lowStock = items.filter((i) => Number(i.current_stock) <= Number(i.reorder_level));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Stock items</h1>

      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          {lowStock.length} item{lowStock.length === 1 ? "" : "s"} at or below reorder level: {lowStock.map((i) => i.name).join(", ")}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`All items (${items.length})`} />
          {!items.length ? (
            <EmptyState>No stock items yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Item</th>
                  <th className="px-5 py-2 font-medium">Category</th>
                  <th className="px-5 py-2 font-medium">Stock</th>
                  <th className="px-5 py-2 font-medium">Reorder</th>
                  <th className="px-5 py-2 font-medium">Unit cost</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const low = Number(item.current_stock) <= Number(item.reorder_level);
                  return (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 font-medium text-gray-900">{item.name}</td>
                      <td className="px-5 py-2.5 text-gray-600">{item.inventory_categories?.name ?? "—"}</td>
                      <td className="px-5 py-2.5">
                        {low ? (
                          <Badge color="amber">
                            {item.current_stock} {item.unit}
                          </Badge>
                        ) : (
                          <span className="text-gray-700">
                            {item.current_stock} {item.unit}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-gray-500">
                        {item.reorder_level} {item.unit}
                      </td>
                      <td className="px-5 py-2.5 text-gray-600">{formatMoney(item.unit_cost, org.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Adjust stock" />
            <form action={recordStockMovement} className="space-y-2 px-5 py-4">
              <div>
                <Label>Item</Label>
                <Select name="inventory_item_id" required>
                  <option value="">Select item…</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select name="movement_type" defaultValue="adjustment">
                  <option value="adjustment">Adjustment (+/-)</option>
                  <option value="consumption">Consumption (-)</option>
                  <option value="wastage">Wastage (-)</option>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input name="quantity" type="number" step="0.001" required />
              </div>
              <div>
                <Label>Notes</Label>
                <Input name="notes" />
              </div>
              <SubmitButton variant="secondary">Record movement</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Add category" />
            <form action={createInventoryCategory} className="space-y-2 px-5 py-4">
              <Input name="name" required placeholder="e.g. Bar Supplies" />
              <SubmitButton variant="secondary">Add category</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Add item" />
            <form action={createInventoryItem} className="space-y-2 px-5 py-4">
              <div>
                <Label>Category</Label>
                <Select name="category_id">
                  <option value="">Uncategorized</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input name="name" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Unit</Label>
                  <Input name="unit" defaultValue="pcs" />
                </div>
                <div>
                  <Label>Unit cost</Label>
                  <Input name="unit_cost" type="number" min={0} step="0.01" defaultValue={0} />
                </div>
                <div>
                  <Label>Opening stock</Label>
                  <Input name="current_stock" type="number" min={0} step="0.001" defaultValue={0} />
                </div>
                <div>
                  <Label>Reorder level</Label>
                  <Input name="reorder_level" type="number" min={0} step="0.001" defaultValue={0} />
                </div>
              </div>
              <SubmitButton>Add item</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
