import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { TRANSFER_STATUS_COLOR } from "@/lib/status-colors";

export default async function TransfersPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: transfers } = await supabase
    .from("stock_transfers")
    .select(
      "id, transfer_number, status, notes, created_at, from_property_id, to_property_id, from:properties!from_property_id(name), to:properties!to_property_id(name)",
    )
    .or(`from_property_id.eq.${org.propertyId},to_property_id.eq.${org.propertyId}`)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Inventory transfers</h1>
        <Link href="/inventory/transfers/new">
          <Button>New transfer</Button>
        </Link>
      </div>

      <Card>
        {!transfers?.length ? (
          <EmptyState>No transfers yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Transfer</th>
                <th className="px-5 py-2 font-medium">Direction</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => {
                const outbound = t.from_property_id === org.propertyId;
                return (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-2.5">
                      <Link href={`/inventory/transfers/${t.id}`} className="font-medium text-slate-900 hover:underline">
                        {t.transfer_number}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {outbound ? `Sending to ${t.to?.name}` : `Receiving from ${t.from?.name}`}
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge color={TRANSFER_STATUS_COLOR[t.status]}>{t.status.replace(/_/g, " ")}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
