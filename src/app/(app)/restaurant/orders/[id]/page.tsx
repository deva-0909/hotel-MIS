import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { addOrderItem } from "@/app/actions/restaurant";
import { Card, CardHeader, Badge, Select, Input, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { OrderLifecycleActions, RemoveItemButton } from "./order-actions";

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
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("id")
    .in("restaurant_id", (restaurants ?? []).map((r) => r.id));
  const categoryIds = (categories ?? []).map((c) => c.id);

  const [{ data: items }, { data: menuItems }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, quantity, unit_price, status, menu_items(name)")
      .eq("order_id", id)
      .order("created_at"),
    categoryIds.length
      ? supabase.from("menu_items").select("id, name, price").eq("is_available", true).in("category_id", categoryIds).order("name")
      : Promise.resolve({ data: [] }),
  ]);

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
          <CardHeader title={`Items — total ₹${total.toFixed(2)}`} />
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
                    <td className="px-5 py-2.5 text-gray-800">{item.menu_items?.name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{item.quantity}</td>
                    <td className="px-5 py-2.5 text-gray-600">₹{(item.quantity * item.unit_price).toFixed(2)}</td>
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

          {order.status === "open" && (
            <form action={addOrderItem.bind(null, order.id)} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
              <div className="flex-1">
                <Label>Menu item</Label>
                <Select name="menu_item_id" required>
                  <option value="">Select item…</option>
                  {menuItems?.map((mi) => (
                    <option key={mi.id} value={mi.id}>
                      {mi.name} — ₹{mi.price}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-24">
                <Label>Qty</Label>
                <Input name="quantity" type="number" min={1} defaultValue={1} />
              </div>
              <SubmitButton variant="secondary">Add</SubmitButton>
            </form>
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
