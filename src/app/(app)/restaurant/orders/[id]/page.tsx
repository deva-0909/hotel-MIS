import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatMoney } from "@/lib/format-money";
import { isWithinMealPeriod } from "@/lib/meal-periods";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { OrderLifecycleActions, RemoveItemButton } from "./order-actions";
import { AddItemForm } from "./add-item-form";
import { UpsellPrompt } from "./upsell-prompt";

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple"> = {
  open: "gray",
  sent_to_kitchen: "amber",
  preparing: "amber",
  ready: "purple",
  served: "blue",
  billed: "green",
  cancelled: "red",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, order_type, status, bill_to_room, notes, restaurant_tables(table_number), guests(full_name), reservations(reservation_number, property_id, properties(name), guests(full_name), rooms(room_number))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const { data: restaurants } = await supabase.from("restaurants").select("id").eq("property_id", org.propertyId);
  const restaurantIds = (restaurants ?? []).map((r) => r.id);
  const { data: categories } = await supabase.from("menu_categories").select("id").in("restaurant_id", restaurantIds);
  const categoryIds = (categories ?? []).map((c) => c.id);

  const [{ data: items }, { data: rawMenuItems }, { data: combos }] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, quantity, unit_price, status, menu_item_id, menu_items(name), menu_item_variants(name), menu_combos(name), order_item_modifiers(modifier_name, price_delta)",
      )
      .eq("order_id", id)
      .order("created_at"),
    categoryIds.length
      ? supabase
          .from("menu_items")
          .select(
            "id, name, price, parcel_price, own_delivery_price, aggregator_price, category_id, meal_periods(start_time, end_time, days_of_week, is_active), menu_item_variants(id, name, price_delta, is_default)",
          )
          .eq("is_available", true)
          .in("category_id", categoryIds)
          .order("name")
      : Promise.resolve({ data: [] }),
    restaurantIds.length
      ? supabase.from("menu_combos").select("id, name, price").eq("is_available", true).in("restaurant_id", restaurantIds).order("name")
      : Promise.resolve({ data: [] }),
  ]);

  // Meal-period filtering happens here rather than in the query itself —
  // "is this item orderable right now" depends on the property's current
  // wall-clock time/day, which isn't expressible as a plain column filter.
  const availableMenuItems = (rawMenuItems ?? []).filter(
    (mi) => !mi.meal_periods || isWithinMealPeriod(mi.meal_periods, org.timezone),
  );
  const menuItemIds = availableMenuItems.map((mi) => mi.id);

  const [{ data: modifierGroups }, { data: upsells }] = await Promise.all([
    menuItemIds.length
      ? supabase
          .from("menu_modifier_groups")
          .select("id, name, selection_type, is_required, menu_item_id, category_id, menu_modifiers(id, name, price_delta)")
          .or(`menu_item_id.in.(${menuItemIds.join(",")}),category_id.in.(${categoryIds.join(",") || "00000000-0000-0000-0000-000000000000"})`)
      : Promise.resolve({ data: [] }),
    menuItemIds.length
      ? supabase
          .from("menu_item_upsells")
          .select("menu_item_id, menu_items!menu_item_upsells_suggested_item_id_fkey(id, name, price)")
          .in("menu_item_id", menuItemIds)
      : Promise.resolve({ data: [] }),
  ]);

  const groupsByItem = new Map<string, typeof modifierGroups>();
  const groupsByCategory = new Map<string, typeof modifierGroups>();
  for (const g of modifierGroups ?? []) {
    if (g.menu_item_id) groupsByItem.set(g.menu_item_id, [...(groupsByItem.get(g.menu_item_id) ?? []), g]);
    if (g.category_id) groupsByCategory.set(g.category_id, [...(groupsByCategory.get(g.category_id) ?? []), g]);
  }

  const formItems = availableMenuItems.map((mi) => ({
    id: mi.id,
    name: mi.name,
    price: mi.price,
    parcel_price: mi.parcel_price,
    own_delivery_price: mi.own_delivery_price,
    aggregator_price: mi.aggregator_price,
    variants: (mi.menu_item_variants ?? []).map((v) => ({ id: v.id, name: v.name, price_delta: Number(v.price_delta), is_default: v.is_default })),
    modifierGroups: [...(groupsByItem.get(mi.id) ?? []), ...(groupsByCategory.get(mi.category_id) ?? [])].map((g) => ({
      id: g.id,
      name: g.name,
      selection_type: g.selection_type as "single" | "multiple",
      is_required: g.is_required,
      modifiers: (g.menu_modifiers ?? []).map((m) => ({ id: m.id, name: m.name, price_delta: Number(m.price_delta) })),
    })),
  }));

  const itemIdsInOrder = new Set((items ?? []).map((i) => i.menu_item_id).filter((v): v is string => v != null));
  const suggestions = (upsells ?? [])
    .filter((u) => itemIdsInOrder.has(u.menu_item_id) && u.menu_items && !itemIdsInOrder.has(u.menu_items.id))
    .map((u) => u.menu_items!)
    .filter((s, idx, arr) => arr.findIndex((x) => x.id === s.id) === idx);

  const total = items?.filter((i) => i.status !== "cancelled").reduce((sum, i) => sum + i.quantity * i.unit_price, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{order.order_number}</h1>
            <Badge color={STATUS_COLOR[order.status]}>{order.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {order.order_type.replace(/_/g, " ")} ·{" "}
            {order.restaurant_tables?.table_number ??
              (order.reservations
                ? `${order.reservations.rooms?.room_number ?? "—"} · ${order.reservations.guests?.full_name ?? "—"}`
                : order.guests?.full_name ?? "—")}
            {order.bill_to_room && " · billed to room"}
            {order.reservations && order.reservations.property_id !== org.propertyId && (
              <span className="text-accent"> · visiting from {order.reservations.properties?.name}</span>
            )}
          </p>
        </div>
        <OrderLifecycleActions orderId={order.id} status={order.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Items — total ${formatMoney(total, org.currency)}`} />
          {!items?.length ? (
            <EmptyState>No items added yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Item</th>
                  <th className="px-5 py-2 font-medium">Qty</th>
                  <th className="px-5 py-2 font-medium">Price</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-800">
                      {item.menu_items?.name ?? item.menu_combos?.name}
                      {item.menu_item_variants && <span className="text-xs text-gray-400"> · {item.menu_item_variants.name}</span>}
                      {!!item.order_item_modifiers?.length && (
                        <div className="text-xs text-gray-400">{item.order_item_modifiers.map((m) => m.modifier_name).join(", ")}</div>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{item.quantity}</td>
                    <td className="px-5 py-2.5 text-gray-600">{formatMoney(item.quantity * item.unit_price, org.currency)}</td>
                    <td className="px-5 py-2.5 capitalize text-gray-500">{item.status}</td>
                    <td className="px-5 py-2.5 text-right">
                      {item.status !== "cancelled" && order.status === "open" && (
                        <RemoveItemButton orderId={order.id} itemId={item.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {order.status === "open" && !!suggestions.length && (
            <UpsellPrompt orderId={order.id} suggestions={suggestions} currency={org.currency} />
          )}

          {order.status === "open" && (
            <AddItemForm orderId={order.id} orderType={order.order_type} items={formItems} combos={combos ?? []} currency={org.currency} />
          )}
        </Card>

        {order.notes && (
          <Card>
            <CardHeader title="Notes" />
            <div className="px-5 py-4 text-sm text-gray-700">{order.notes}</div>
          </Card>
        )}
      </div>
    </div>
  );
}
