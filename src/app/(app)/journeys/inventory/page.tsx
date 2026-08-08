import { getOrgContext } from "@/lib/org-context";
import { Card, Breadcrumb } from "@/components/ui";
import { JourneyFlow } from "@/components/journey-flow";

const STEPS = [
  { dept: "STORES & PURCHASE", label: "Purchase Request" },
  { dept: "STORES & PURCHASE", label: "Approval" },
  { dept: "STORES & PURCHASE", label: "RFQ" },
  { dept: "STORES & PURCHASE", label: "Vendor" },
  { dept: "STORES & PURCHASE", label: "Purchase Order" },
  { dept: "STORES & PURCHASE", label: "GRN" },
  { dept: "STORES & PURCHASE", label: "QC" },
  { dept: "STORES & PURCHASE", label: "Store" },
  { dept: "KITCHEN", label: "Kitchen" },
  { dept: "KITCHEN", label: "Consumption" },
  { dept: "KITCHEN", label: "Recipe" },
  { dept: "ACCOUNTS & FINANCE", label: "Food Cost" },
  { dept: "ACCOUNTS & FINANCE", label: "Variance" },
];

export default async function InventoryJourneyPage() {
  const org = await getOrgContext();
  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Inventory Journey"]} />
      <h1 className="text-xl text-gray-900">Inventory Journey</h1>
      <p className="-mt-4 text-sm text-gray-500">
        How stock moves from requisition through consumption into food cost and variance reporting.
      </p>
      <Card className="p-6">
        <JourneyFlow steps={STEPS} />
      </Card>
    </div>
  );
}
