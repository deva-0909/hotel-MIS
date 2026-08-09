import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, Badge, Button, EmptyState } from "@/components/ui";

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple"> = {
  open: "gray",
  sent_to_kitchen: "amber",
  preparing: "amber",
  ready: "purple",
  served: "blue",
  billed: "green",
  cancelled: "red",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, order_type, status, bill_to_room, created_at, restaurant_tables(table_number), guests(full_name)")
    .eq("property_id", org.propertyId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
        <Link href="/restaurant/orders/new">
          <Button>New order</Button>
        </Link>
      </div>

      <Card>
        {!orders?.length ? (
          <EmptyState>No orders yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Order</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Table / Guest</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-2.5">
                    <Link href={`/restaurant/orders/${o.id}`} className="font-medium text-slate-900 hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 capitalize text-gray-600">{o.order_type.replace(/_/g, " ")}</td>
                  <td className="px-5 py-2.5 text-gray-600">
                    {o.restaurant_tables?.table_number ?? o.guests?.full_name ?? "—"}
                    {o.bill_to_room && <span className="ml-1 text-xs text-purple-600">(bill to room)</span>}
                  </td>
                  <td className="px-5 py-2.5">
                    <Badge color={STATUS_COLOR[o.status]}>{o.status.replace(/_/g, " ")}</Badge>
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
