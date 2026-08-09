import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { createMenuCategory, createMenuItem } from "@/app/actions/restaurant";
import { adoptMenuCategoryTemplate } from "@/app/actions/templates";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, Badge, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MenuItemToggle } from "@/components/menu-item-toggle";

export default async function MenuPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: restaurants }, { data: kitchens }, { data: categoryTemplates }] = await Promise.all([
    supabase.from("restaurants").select("id, name").eq("property_id", org.propertyId).order("name"),
    supabase.from("kitchens").select("id, name").order("name"),
    supabase.from("corporate_menu_category_templates").select("id, name").order("sort_order"),
  ]);
  const restaurantIds = (restaurants ?? []).map((r) => r.id);
  const restaurantById = new Map((restaurants ?? []).map((r) => [r.id, r.name]));

  const { data: categories } = restaurantIds.length
    ? await supabase
        .from("menu_categories")
        .select("id, name, sort_order, restaurant_id, kitchen_id, kitchens(name)")
        .in("restaurant_id", restaurantIds)
        .order("sort_order")
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
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-x-auto">
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
                      <td className="px-3 py-2 text-gray-700">{formatMoney(item.price, org.currency)}</td>
                      <td className="px-3 py-2 text-gray-700">{item.parcel_price ? formatMoney(item.parcel_price, org.currency) : "—"}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {item.own_delivery_price ? formatMoney(item.own_delivery_price, org.currency) : "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {item.aggregator_price ? formatMoney(item.aggregator_price, org.currency) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <MenuItemToggle itemId={item.id} available={item.is_available} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="overflow-x-auto">
            <CardHeader title="Categories & kitchen routing" />
            {!categories?.length ? (
              <EmptyState>No categories yet.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                    <th className="px-5 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Restaurant</th>
                    <th className="px-3 py-2 font-medium">Kitchen</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2 text-gray-800">{c.name}</td>
                      <td className="px-3 py-2 text-gray-500">{restaurantById.get(c.restaurant_id) ?? "—"}</td>
                      <td className="px-3 py-2">
                        {c.kitchens?.name ? <Badge color="gold">{c.kitchens.name}</Badge> : <span className="text-gray-400">Local only</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

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
              <div>
                <Label>Kitchen (optional)</Label>
                <Select name="kitchen_id" defaultValue="">
                  <option value="">Local — this property&apos;s own kitchen</option>
                  {kitchens?.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </Select>
              </div>
              <SubmitButton>Add category</SubmitButton>
            </form>
            {categoryTemplates && categoryTemplates.length > 0 && (
              <form action={adoptMenuCategoryTemplate} className="space-y-2 border-t border-gray-100 px-5 py-4">
                <div>
                  <Label>Or adopt a corporate template</Label>
                  <Select name="template_id" required>
                    <option value="">Select template…</option>
                    {categoryTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Into restaurant</Label>
                  <Select name="restaurant_id" required>
                    <option value="">Select restaurant…</option>
                    {restaurants?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <SubmitButton variant="secondary">Adopt</SubmitButton>
              </form>
            )}
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
