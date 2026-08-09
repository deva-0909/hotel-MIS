import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { createMenuCategory, createMenuItem } from "@/app/actions/restaurant";
import { Card, CardHeader, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MenuItemToggle } from "@/components/menu-item-toggle";

export default async function MenuPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("property_id", org.propertyId)
    .order("name");
  const restaurantIds = (restaurants ?? []).map((r) => r.id);

  const { data: categories } = restaurantIds.length
    ? await supabase.from("menu_categories").select("id, name, sort_order, restaurant_id").in("restaurant_id", restaurantIds).order("sort_order")
    : { data: [] };
  const categoryIds = (categories ?? []).map((c) => c.id);

  const { data: items } = categoryIds.length
    ? await supabase
        .from("menu_items")
        .select(
          "id, name, price, parcel_price, own_delivery_price, aggregator_price, is_veg, is_available, category_id, menu_categories(name)",
        )
        .in("category_id", categoryIds)
        .order("name")
    : { data: [] };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Menu Management"]} />
      <h1 className="text-xl text-gray-900">Menu Management</h1>
      <p className="-mt-4 text-sm text-gray-500">
        One menu, per-channel pricing and availability — a stock-out here syncs to every channel.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-x-auto lg:col-span-2">
          {!items?.length ? (
            <EmptyState>No menu items yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-4 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Dine-In</th>
                  <th className="px-3 py-2 font-medium">Parcel</th>
                  <th className="px-3 py-2 font-medium">Own Delivery</th>
                  <th className="px-3 py-2 font-medium">Aggregator</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 text-gray-800">
                      <span className={`mr-2 inline-block h-2 w-2 rounded-full ${item.is_veg ? "bg-emerald-500" : "bg-red-500"}`} />
                      {item.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500">{item.menu_categories?.name}</td>
                    <td className="px-3 py-2 text-gray-700">₹{item.price}</td>
                    <td className="px-3 py-2 text-gray-700">{item.parcel_price ? `₹${item.parcel_price}` : "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{item.own_delivery_price ? `₹${item.own_delivery_price}` : "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{item.aggregator_price ? `₹${item.aggregator_price}` : "—"}</td>
                    <td className="px-3 py-2">
                      <MenuItemToggle itemId={item.id} available={item.is_available} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Add category" />
            <form action={createMenuCategory} className="space-y-2 px-5 py-4">
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
                <Label>Name</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input name="sort_order" type="number" defaultValue={0} />
              </div>
              <SubmitButton>Add category</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Add menu item" />
            <form action={createMenuItem} className="space-y-2 px-5 py-4">
              <div>
                <Label>Category</Label>
                <Select name="category_id" required>
                  <option value="">Select category…</option>
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
                  <Label>Dine-in price</Label>
                  <Input name="price" type="number" min={0} step="0.01" required />
                </div>
                <div>
                  <Label>Parcel price</Label>
                  <Input name="parcel_price" type="number" min={0} step="0.01" />
                </div>
                <div>
                  <Label>Own delivery price</Label>
                  <Input name="own_delivery_price" type="number" min={0} step="0.01" />
                </div>
                <div>
                  <Label>Aggregator price</Label>
                  <Input name="aggregator_price" type="number" min={0} step="0.01" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="is_veg" defaultChecked /> Vegetarian
              </label>
              <div>
                <Label>Description</Label>
                <Input name="description" />
              </div>
              <SubmitButton>Add item</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
