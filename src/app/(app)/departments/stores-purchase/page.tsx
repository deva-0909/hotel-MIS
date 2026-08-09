import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, StatTile, EmptyState, Button } from "@/components/ui";
import { PO_STATUS_COLOR } from "@/lib/status-colors";

export default async function StoresPurchaseDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: rawItems }, { data: pos }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("id, name, unit_cost, property_inventory(current_stock, reorder_level)")
      .eq("property_inventory.property_id", org.propertyId),
    supabase
      .from("purchase_orders")
      .select("id, po_number, status, suppliers(name)")
      .eq("property_id", org.propertyId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const items = (rawItems ?? []).map((i) => ({
    ...i,
    current_stock: i.property_inventory[0]?.current_stock ?? 0,
    reorder_level: i.property_inventory[0]?.reorder_level ?? 0,
  }));
  const lowStock = items.filter((i) => Number(i.current_stock) <= Number(i.reorder_level));
  const stockValue = items.reduce((sum, i) => sum + Number(i.current_stock) * Number(i.unit_cost), 0);
  const openPOs = pos?.filter((p) => !["received", "rejected", "cancelled"].includes(p.status)).length ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Stores & Purchase"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          SP
        </span>
        <h1 className="text-xl text-gray-900">Stores &amp; Purchase</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Open POs" value={openPOs} />
        <StatTile label="Stock Value" value={`₹${stockValue.toFixed(0)}`} />
        <StatTile label="Low-Stock SKUs" value={lowStock.length} />
        <StatTile label="Total Items" value={items?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Purchase orders" />
          {!pos?.length ? (
            <EmptyState>No purchase orders yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">PO</th>
                  <th className="px-5 py-2 font-medium">Vendor</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5">
                      <Link href={`/inventory/purchase-orders/${po.id}`} className="font-medium text-gray-900 hover:underline">
                        {po.po_number}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{po.suppliers?.name}</td>
                    <td className="px-5 py-2.5">
                      <Badge color={PO_STATUS_COLOR[po.status]}>{po.status.replace(/_/g, " ")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <div className="flex flex-col gap-2 p-4">
            <Link href="/inventory/purchase-orders/new"><Button variant="secondary" className="w-full">Create Purchase Order</Button></Link>
            <Link href="/live/purchase-board"><Button variant="secondary" className="w-full">Approval Board</Button></Link>
            <Link href="/inventory/items"><Button variant="secondary" className="w-full">Stock Items</Button></Link>
            <Link href="/inventory/suppliers"><Button variant="secondary" className="w-full">Suppliers</Button></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
