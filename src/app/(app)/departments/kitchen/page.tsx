import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, StatTile, EmptyState } from "@/components/ui";

// A ticket routes to this kitchen queue by which kitchen prepares its menu
// category, not by which property placed the order: a category left
// unassigned stays local to its own restaurant's property (pre-kitchens
// behavior), while a category assigned to a kitchen surfaces here for every
// property that kitchen serves — letting one central kitchen's screen show
// tickets fired from several properties at once.
export default async function KitchenDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: myKitchenLinks } = await supabase
    .from("kitchen_properties")
    .select("kitchen_id")
    .eq("property_id", org.propertyId);
  const myKitchenIds = (myKitchenLinks ?? []).map((k) => k.kitchen_id);

  const { data: networkLinks } = myKitchenIds.length
    ? await supabase.from("kitchen_properties").select("property_id").in("kitchen_id", myKitchenIds)
    : { data: [] };
  const networkPropertyIds = Array.from(new Set([org.propertyId, ...(networkLinks ?? []).map((l) => l.property_id)]));

  const [{ data: restaurants }, { data: properties }] = await Promise.all([
    supabase.from("restaurants").select("id, property_id").in("property_id", networkPropertyIds),
    supabase.from("properties").select("id, name").in("id", networkPropertyIds),
  ]);
  const propertyNameById = new Map((properties ?? []).map((p) => [p.id, p.name]));
  const restaurantIds = (restaurants ?? []).map((r) => r.id);
  const propertyByRestaurant = new Map((restaurants ?? []).map((r) => [r.id, r.property_id]));

  const { data: categories } = restaurantIds.length
    ? await supabase.from("menu_categories").select("id, kitchen_id, restaurant_id").in("restaurant_id", restaurantIds)
    : { data: [] };

  // Local-only categories (kitchen_id null) route to their own property
  // only; kitchen-assigned categories route to every property that kitchen
  // serves, regardless of where the order was placed.
  const myCategoryIds = (categories ?? [])
    .filter((c) =>
      c.kitchen_id ? myKitchenIds.includes(c.kitchen_id) : propertyByRestaurant.get(c.restaurant_id) === org.propertyId,
    )
    .map((c) => c.id);

  const { data: menuItems } = myCategoryIds.length
    ? await supabase.from("menu_items").select("id").in("category_id", myCategoryIds)
    : { data: [] };
  const menuItemIds = (menuItems ?? []).map((m) => m.id);

  const { data: tickets } = menuItemIds.length
    ? await supabase
        .from("order_items")
        .select(
          "id, quantity, status, kot_sent_at, menu_items(name), orders(order_number, property_id, restaurant_tables(table_number))",
        )
        .in("menu_item_id", menuItemIds)
        .in("status", ["pending", "preparing"])
        .order("kot_sent_at", { ascending: true, nullsFirst: true })
    : { data: [] };

  const preparing = tickets?.filter((t) => t.status === "preparing").length ?? 0;
  const isNetworked = myKitchenIds.length > 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Kitchen"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          KT
        </span>
        <h1 className="text-xl text-gray-900">Kitchen</h1>
        {isNetworked && <Badge color="gold">Central kitchen network</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Open Tickets" value={tickets?.length ?? 0} />
        <StatTile label="Cooking" value={preparing} />
      </div>

      <Card>
        <CardHeader title="Kitchen order ticket queue" />
        {!tickets?.length ? (
          <EmptyState>No open tickets.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Order</th>
                {isNetworked && <th className="px-5 py-2 font-medium">Property</th>}
                <th className="px-5 py-2 font-medium">Table</th>
                <th className="px-5 py-2 font-medium">Item</th>
                <th className="px-5 py-2 font-medium">Qty</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800">{t.orders?.order_number}</td>
                  {isNetworked && (
                    <td className="px-5 py-2.5 text-gray-600">
                      {t.orders?.property_id ? propertyNameById.get(t.orders.property_id) ?? "—" : "—"}
                    </td>
                  )}
                  <td className="px-5 py-2.5 text-gray-600">{t.orders?.restaurant_tables?.table_number ?? "—"}</td>
                  <td className="px-5 py-2.5 text-gray-800">{t.menu_items?.name}</td>
                  <td className="px-5 py-2.5 text-gray-600">{t.quantity}</td>
                  <td className="px-5 py-2.5">
                    <Badge color={t.status === "preparing" ? "amber" : "gray"}>{t.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
