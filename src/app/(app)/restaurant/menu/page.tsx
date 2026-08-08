import { createClient } from "@/lib/supabase/server";
import { createMenuCategory, createMenuItem } from "@/app/actions/restaurant";
import { Card, CardHeader, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MenuItemToggle } from "@/components/menu-item-toggle";

export default async function MenuPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from("menu_categories").select("id, name, sort_order").order("sort_order"),
    supabase.from("menu_items").select("id, name, price, is_veg, is_available, category_id, menu_categories(name)").order("name"),
  ]);

  const byCategory = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const key = item.category_id;
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Menu</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {!categories?.length ? (
            <Card>
              <EmptyState>No menu categories yet.</EmptyState>
            </Card>
          ) : (
            categories.map((cat) => (
              <Card key={cat.id}>
                <CardHeader title={cat.name} />
                {!byCategory.get(cat.id)?.length ? (
                  <EmptyState>No items in this category.</EmptyState>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {byCategory.get(cat.id)!.map((item) => (
                        <tr key={item.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-2.5 text-gray-800">
                            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${item.is_veg ? "bg-emerald-500" : "bg-red-500"}`} />
                            {item.name}
                          </td>
                          <td className="px-5 py-2.5 text-gray-600">₹{item.price}</td>
                          <td className="px-5 py-2.5 text-right">
                            <MenuItemToggle itemId={item.id} available={item.is_available} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            ))
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Add category" />
            <form action={createMenuCategory} className="space-y-2 px-5 py-4">
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
              <div>
                <Label>Price</Label>
                <Input name="price" type="number" min={0} step="0.01" required />
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
