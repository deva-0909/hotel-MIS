import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatMoney } from "@/lib/format-money";
import { addPurchaseOrderItem } from "@/app/actions/inventory";
import { Card, CardHeader, Badge, Select, Input, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MarkOrderedButton, ReceiveLineControl } from "./po-actions";
import { PO_STATUS_COLOR } from "@/lib/status-colors";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: po } = await supabase
    .from("purchase_orders")
    .select("id, po_number, status, order_date, expected_date, notes, suppliers(name, phone)")
    .eq("id", id)
    .maybeSingle();

  if (!po) notFound();

  const [{ data: items }, { data: inventoryItems }] = await Promise.all([
    supabase
      .from("purchase_order_items")
      .select("id, quantity, unit_cost, received_quantity, inventory_items(name, unit)")
      .eq("po_id", id),
    supabase.from("inventory_items").select("id, name, unit").order("name"),
  ]);

  const totalValue = items?.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{po.po_number}</h1>
            <Badge color={PO_STATUS_COLOR[po.status]}>{po.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {po.suppliers?.name} · Ordered {po.order_date}
            {po.expected_date ? ` · Expected ${po.expected_date}` : ""}
          </p>
        </div>
        {po.status === "draft" && <MarkOrderedButton poId={po.id} />}
      </div>

      <Card>
        <CardHeader title={`Line items — value ${formatMoney(totalValue, org.currency)}`} />
        {!items?.length ? (
          <EmptyState>No line items yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Item</th>
                <th className="px-5 py-2 font-medium">Ordered</th>
                <th className="px-5 py-2 font-medium">Unit cost</th>
                <th className="px-5 py-2 font-medium">Received</th>
                <th className="px-5 py-2 font-medium">Receive more</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800">{item.inventory_items?.name}</td>
                  <td className="px-5 py-2.5 text-gray-600">
                    {item.quantity} {item.inventory_items?.unit}
                  </td>
                  <td className="px-5 py-2.5 text-gray-600">{formatMoney(item.unit_cost, org.currency)}</td>
                  <td className="px-5 py-2.5 text-gray-600">
                    {item.received_quantity} {item.inventory_items?.unit}
                  </td>
                  <td className="px-5 py-2.5">
                    {(po.status === "ordered" || po.status === "partially_received") && (
                      <ReceiveLineControl poId={po.id} poItemId={item.id} outstanding={item.quantity - item.received_quantity} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {po.status === "draft" && (
          <form action={addPurchaseOrderItem.bind(null, po.id)} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
            <div className="flex-1">
              <Label>Item</Label>
              <Select name="inventory_item_id" required>
                <option value="">Select item…</option>
                {inventoryItems?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-28">
              <Label>Quantity</Label>
              <Input name="quantity" type="number" min={0.001} step="0.001" required />
            </div>
            <div className="w-28">
              <Label>Unit cost</Label>
              <Input name="unit_cost" type="number" min={0} step="0.01" />
            </div>
            <SubmitButton variant="secondary">Add line</SubmitButton>
          </form>
        )}
      </Card>
    </div>
  );
}
