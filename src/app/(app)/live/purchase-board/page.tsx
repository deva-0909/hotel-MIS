import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, Breadcrumb, EmptyState } from "@/components/ui";
import { PurchaseBoardCard } from "./purchase-board-actions";

const COLUMNS: { status: string; label: string }[] = [
  { status: "draft", label: "Requested" },
  { status: "pending_approval", label: "Pending Approval" },
  { status: "approved", label: "Approved" },
  { status: "ordered", label: "PO Issued" },
  { status: "partially_received", label: "Partially Received" },
  { status: "received", label: "GRN Received" },
  { status: "rejected", label: "Rejected" },
];

export default async function PurchaseBoardPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: pos } = await supabase
    .from("purchase_orders")
    .select("id, po_number, status, suppliers(name)")
    .order("created_at", { ascending: false });

  const byStatus = new Map<string, typeof pos>();
  for (const po of pos ?? []) {
    byStatus.set(po.status, [...(byStatus.get(po.status) ?? []), po]);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Purchase Board"]} />
      <h1 className="text-xl text-gray-900">Purchase Approval Board</h1>
      <p className="-mt-4 text-sm text-gray-500">Every requisition&apos;s path from request to goods receipt.</p>

      {!pos?.length ? (
        <Card>
          <EmptyState>No purchase orders yet. Create one from Stores &amp; Purchase.</EmptyState>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((col) => (
            <div key={col.status} className="w-64 shrink-0">
              <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{col.label}</div>
              <div className="space-y-2">
                {(byStatus.get(col.status) ?? []).map((po) => (
                  <PurchaseBoardCard key={po.id} poId={po.id} poNumber={po.po_number} supplier={po.suppliers?.name ?? ""} status={po.status} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
