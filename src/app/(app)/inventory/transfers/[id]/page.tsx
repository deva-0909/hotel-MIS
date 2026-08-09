import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addTransferItem } from "@/app/actions/transfers";
import { Card, CardHeader, Badge, Select, Input, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { TransferLifecycleActions, RemoveTransferItemButton } from "./transfer-actions";
import { TRANSFER_STATUS_COLOR } from "@/lib/status-colors";

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: transfer } = await supabase
    .from("stock_transfers")
    .select(
      "id, transfer_number, status, notes, created_at, from:properties!from_property_id(name), to:properties!to_property_id(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!transfer) notFound();

  const [{ data: items }, { data: inventoryItems }] = await Promise.all([
    supabase
      .from("stock_transfer_items")
      .select("id, quantity, inventory_items(name, unit)")
      .eq("transfer_id", id),
    supabase.from("inventory_items").select("id, name, unit").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{transfer.transfer_number}</h1>
            <Badge color={TRANSFER_STATUS_COLOR[transfer.status]}>{transfer.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {transfer.from?.name} → {transfer.to?.name}
            {transfer.notes ? ` · ${transfer.notes}` : ""}
          </p>
        </div>
        <TransferLifecycleActions transferId={transfer.id} status={transfer.status} />
      </div>

      <Card>
        <CardHeader title="Line items" />
        {!items?.length ? (
          <EmptyState>No items added yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Item</th>
                <th className="px-5 py-2 font-medium">Quantity</th>
                <th className="px-5 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800">{item.inventory_items?.name}</td>
                  <td className="px-5 py-2.5 text-gray-600">
                    {item.quantity} {item.inventory_items?.unit}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    {transfer.status === "requested" && <RemoveTransferItemButton transferId={transfer.id} itemId={item.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {transfer.status === "requested" && (
          <form action={addTransferItem.bind(null, transfer.id)} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
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
            <SubmitButton variant="secondary">Add line</SubmitButton>
          </form>
        )}
      </Card>
    </div>
  );
}
