import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { PO_STATUS_COLOR } from "@/lib/status-colors";

export default async function PurchaseOrdersPage() {
  const supabase = await createClient();
  const { data: pos } = await supabase
    .from("purchase_orders")
    .select("id, po_number, status, order_date, expected_date, suppliers(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Purchase orders</h1>
        <Link href="/inventory/purchase-orders/new">
          <Button>New purchase order</Button>
        </Link>
      </div>

      <Card>
        {!pos?.length ? (
          <EmptyState>No purchase orders yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">PO</th>
                <th className="px-5 py-2 font-medium">Supplier</th>
                <th className="px-5 py-2 font-medium">Order date</th>
                <th className="px-5 py-2 font-medium">Expected</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => (
                <tr key={po.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-2.5">
                    <Link href={`/inventory/purchase-orders/${po.id}`} className="font-medium text-slate-900 hover:underline">
                      {po.po_number}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-gray-700">{po.suppliers?.name}</td>
                  <td className="px-5 py-2.5 text-gray-600">{po.order_date}</td>
                  <td className="px-5 py-2.5 text-gray-600">{po.expected_date ?? "—"}</td>
                  <td className="px-5 py-2.5">
                    <Badge color={PO_STATUS_COLOR[po.status]}>{po.status.replace(/_/g, " ")}</Badge>
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
