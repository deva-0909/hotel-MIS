import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import {
  createMenuCategory,
  createMenuItem,
  createMealPeriod,
  createMenuItemVariant,
  createModifierGroup,
  createModifier,
  createCombo,
  addComboItem,
  createUpsell,
} from "@/app/actions/restaurant";
import { adoptMenuCategoryTemplate, adoptMenuItemTemplate } from "@/app/actions/templates";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, Badge, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MenuItemToggle } from "@/components/menu-item-toggle";
import {
  ItemMealPeriodSelect,
  ComboAvailabilityToggle,
  DeleteMealPeriodButton,
  DeleteVariantButton,
  DeleteModifierGroupButton,
  DeleteModifierButton,
  RemoveComboItemButton,
  DeleteUpsellButton,
} from "./menu-master-controls";

const DAY_OPTIONS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default async function MenuPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: restaurants }, { data: kitchens }, { data: categoryTemplates }, { data: itemTemplates }] = await Promise.all([
    supabase.from("restaurants").select("id, name").eq("property_id", org.propertyId).order("name"),
    supabase.from("kitchens").select("id, name").order("name"),
    supabase.from("corporate_menu_category_templates").select("id, name").order("sort_order"),
    supabase.from("corporate_menu_item_templates").select("id, name, price").order("name"),
  ]);
  const restaurantIds = (restaurants ?? []).map((r) => r.id);
  const restaurantById = new Map((restaurants ?? []).map((r) => [r.id, r.name]));

  const [{ data: categories }, { data: mealPeriods }, { data: combos }] = await Promise.all([
    restaurantIds.length
      ? supabase.from("menu_categories").select("id, name, sort_order, restaurant_id, kitchen_id, kitchens(name)").in("restaurant_id", restaurantIds).order("sort_order")
      : Promise.resolve({ data: [] }),
    restaurantIds.length
      ? supabase.from("meal_periods").select("id, restaurant_id, name, start_time, end_time, days_of_week, is_active").in("restaurant_id", restaurantIds).order("start_time")
      : Promise.resolve({ data: [] }),
    restaurantIds.length
      ? supabase
          .from("menu_combos")
          .select("id, restaurant_id, name, price, is_available, menu_combo_items(id, quantity, menu_items(name))")
          .in("restaurant_id", restaurantIds)
          .order("name")
      : Promise.resolve({ data: [] }),
  ]);
  const categoryIds = (categories ?? []).map((c) => c.id);

  const [{ data: items }, { data: variants }, { data: modifierGroups }, { data: upsells }] = await Promise.all([
    categoryIds.length
      ? supabase
          .from("menu_items")
          .select(
            "id, name, price, parcel_price, own_delivery_price, aggregator_price, is_veg, is_available, category_id, meal_period_id, menu_categories(name)",
          )
          .in("category_id", categoryIds)
          .order("name")
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? supabase.from("menu_item_variants").select("id, name, price_delta, is_default, menu_item_id, menu_items(name)").order("name")
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? supabase
          .from("menu_modifier_groups")
          .select(
            "id, name, selection_type, is_required, menu_item_id, category_id, menu_items(name), menu_categories(name), menu_modifiers(id, name, price_delta)",
          )
          .order("name")
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? supabase
          .from("menu_item_upsells")
          .select(
            "id, note, item:menu_items!menu_item_upsells_menu_item_id_fkey(name), suggested:menu_items!menu_item_upsells_suggested_item_id_fkey(name)",
          )
          .order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Menu Management"]} />
      <h1 className="text-xl text-gray-900">Menu Management</h1>
      <p className="-mt-4 text-sm text-gray-500">
        One menu, per-channel pricing and availability — a stock-out here syncs to every channel. Items can carry a
        meal period (breakfast/lunch/dinner, restricted by time and day), size/variant options, modifiers or paid
        add-ons, and upsell suggestions shown when ordering.
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
                    <th className="px-3 py-2 font-medium">Meal period</th>
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
                        <ItemMealPeriodSelect
                          itemId={item.id}
                          currentPeriodId={item.meal_period_id}
                          periods={(mealPeriods ?? []).filter((p) => p.restaurant_id === categories?.find((c) => c.id === item.category_id)?.restaurant_id)}
                        />
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

          <Card>
            <CardHeader title="Size / variant options" />
            {!variants?.length ? (
              <EmptyState>No variants configured — items sell at their flat price.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-5 py-2 text-sm">
                    <span className="text-gray-700">
                      {v.menu_items?.name} — {v.name} {v.is_default && <Badge color="blue">default</Badge>}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{v.price_delta ? `+${formatMoney(v.price_delta, org.currency)}` : "—"}</span>
                      <DeleteVariantButton variantId={v.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form action={createMenuItemVariant} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
              <div className="flex-1">
                <Label>Item</Label>
                <Select name="menu_item_id" required>
                  <option value="">Select item…</option>
                  {items?.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-28">
                <Label>Name</Label>
                <Input name="name" required placeholder="Large" />
              </div>
              <div className="w-24">
                <Label>+Price</Label>
                <Input name="price_delta" type="number" step="0.01" defaultValue={0} />
              </div>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input type="checkbox" name="is_default" /> Default
              </label>
              <SubmitButton variant="secondary">Add</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Modifiers & add-ons" />
            {!modifierGroups?.length ? (
              <EmptyState>No modifier groups yet.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {modifierGroups.map((g) => (
                  <div key={g.id} className="px-5 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">
                        {g.name} <span className="text-xs font-normal text-gray-400">({g.menu_items?.name ?? `all of ${g.menu_categories?.name}`})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {g.is_required && <Badge color="amber">required</Badge>}
                        <Badge color="gray">{g.selection_type}</Badge>
                        <DeleteModifierGroupButton groupId={g.id} />
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(g.menu_modifiers ?? []).map((m) => (
                        <span key={m.id} className="flex items-center gap-1 rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                          {m.name} {m.price_delta ? `+${formatMoney(m.price_delta, org.currency)}` : ""}
                          <DeleteModifierButton modifierId={m.id} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form action={createModifierGroup} className="space-y-2 border-t border-gray-100 px-5 py-4">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">New group</div>
              <div className="flex gap-2">
                <Select name="scope" defaultValue="item" className="w-32">
                  <option value="item">One item</option>
                  <option value="category">Whole category</option>
                </Select>
                <Select name="menu_item_id" className="flex-1">
                  <option value="">Item…</option>
                  {items?.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
                <Select name="category_id" className="flex-1">
                  <option value="">Category…</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2">
                <Input name="name" required placeholder="e.g. Spice Level" className="flex-1" />
                <Select name="selection_type" defaultValue="single" className="w-32">
                  <option value="single">Pick one</option>
                  <option value="multiple">Pick many</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="is_required" /> Required at order time
              </label>
              <SubmitButton variant="secondary">Add group</SubmitButton>
            </form>
            <form action={createModifier} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
              <div className="text-xs text-gray-400">Add option to group:</div>
              <Select name="group_id" className="flex-1" required>
                <option value="">Select group…</option>
                {modifierGroups?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.menu_items?.name ?? g.menu_categories?.name})
                  </option>
                ))}
              </Select>
              <Input name="name" required placeholder="Extra cheese" className="w-32" />
              <Input name="price_delta" type="number" step="0.01" defaultValue={0} className="w-20" />
              <SubmitButton variant="secondary">Add</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Combos" />
            {!combos?.length ? (
              <EmptyState>No combos yet.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {combos.map((c) => (
                  <div key={c.id} className="px-5 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">
                        {c.name} <span className="text-xs font-normal text-gray-400">({restaurantById.get(c.restaurant_id)})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">{formatMoney(c.price, org.currency)}</span>
                        <ComboAvailabilityToggle comboId={c.id} available={c.is_available} />
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(c.menu_combo_items ?? []).map((ci) => (
                        <span key={ci.id} className="flex items-center gap-1 rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                          {ci.quantity}× {ci.menu_items?.name}
                          <RemoveComboItemButton comboItemId={ci.id} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form action={createCombo} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
              <Select name="restaurant_id" className="flex-1" required>
                <option value="">Restaurant…</option>
                {restaurants?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
              <Input name="name" required placeholder="Combo name" className="flex-1" />
              <Input name="price" type="number" min={0} step="0.01" required className="w-24" placeholder="Price" />
              <SubmitButton variant="secondary">Add combo</SubmitButton>
            </form>
            <form action={addComboItem} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
              <div className="text-xs text-gray-400">Add item to combo:</div>
              <Select name="combo_id" className="flex-1" required>
                <option value="">Select combo…</option>
                {combos?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select name="menu_item_id" className="flex-1" required>
                <option value="">Select item…</option>
                {items?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
              <Input name="quantity" type="number" min={1} defaultValue={1} className="w-16" />
              <SubmitButton variant="secondary">Add</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Upsell suggestions" />
            {!upsells?.length ? (
              <EmptyState>No upsell suggestions yet.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {upsells.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-2 text-sm">
                    <span className="text-gray-700">
                      {u.item?.name} → {u.suggested?.name} {u.note && <span className="text-xs text-gray-400">({u.note})</span>}
                    </span>
                    <DeleteUpsellButton upsellId={u.id} />
                  </div>
                ))}
              </div>
            )}
            <form action={createUpsell} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
              <Select name="menu_item_id" className="flex-1" required>
                <option value="">When ordering…</option>
                {items?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
              <Select name="suggested_item_id" className="flex-1" required>
                <option value="">Suggest…</option>
                {items?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
              <Input name="note" placeholder="Note (optional)" className="w-32" />
              <SubmitButton variant="secondary">Add</SubmitButton>
            </form>
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
            {itemTemplates && itemTemplates.length > 0 && (
              <form action={adoptMenuItemTemplate} className="space-y-2 border-t border-gray-100 px-5 py-4">
                <div>
                  <Label>Or adopt a corporate item template</Label>
                  <Select name="template_id" required>
                    <option value="">Select template…</option>
                    {itemTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {formatMoney(t.price, org.currency)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Into category</Label>
                  <Select name="category_id" required>
                    <option value="">Select category…</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <SubmitButton variant="secondary">Adopt</SubmitButton>
              </form>
            )}
          </Card>

          <Card>
            <CardHeader title="Meal periods" />
            {!mealPeriods?.length ? (
              <EmptyState>No meal periods yet — every item sells all day.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {mealPeriods.map((p) => (
                  <div key={p.id} className="px-5 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">
                        {p.name} <span className="text-xs text-gray-400">({restaurantById.get(p.restaurant_id)})</span>
                      </span>
                      <DeleteMealPeriodButton periodId={p.id} />
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.start_time.slice(0, 5)}–{p.end_time.slice(0, 5)} · {p.days_of_week.length === 7 ? "every day" : p.days_of_week.map((d) => d.slice(0, 3)).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form action={createMealPeriod} className="space-y-2 border-t border-gray-100 px-5 py-4">
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
                <Input name="name" required placeholder="Breakfast" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start</Label>
                  <Input name="start_time" type="time" required />
                </div>
                <div>
                  <Label>End</Label>
                  <Input name="end_time" type="time" required />
                </div>
              </div>
              <div>
                <Label>Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((d) => (
                    <label key={d} className="flex items-center gap-1 text-xs text-gray-600">
                      <input type="checkbox" name="days_of_week" value={d} defaultChecked /> {d.slice(0, 3)}
                    </label>
                  ))}
                </div>
              </div>
              <SubmitButton variant="secondary">Add period</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
