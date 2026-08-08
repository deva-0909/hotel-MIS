import { getOrgContext } from "@/lib/org-context";
import { Card, Breadcrumb } from "@/components/ui";
import { JourneyFlow } from "@/components/journey-flow";

const STEPS = [
  { dept: "FRONT OFFICE", label: "Guest Arrives" },
  { dept: "RESTAURANT", label: "Table Allocation" },
  { dept: "RESTAURANT", label: "Captain" },
  { dept: "RESTAURANT", label: "KOT" },
  { dept: "KITCHEN", label: "Kitchen" },
  { dept: "RESTAURANT", label: "Serving" },
  { dept: "RESTAURANT", label: "Billing" },
  { dept: "ACCOUNTS & FINANCE", label: "Payment" },
  { dept: "CRM & MARKETING", label: "Feedback" },
  { dept: "CRM & MARKETING", label: "CRM" },
];

export default async function RestaurantJourneyPage() {
  const org = await getOrgContext();
  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Restaurant Journey"]} />
      <h1 className="text-xl text-gray-900">Restaurant Journey</h1>
      <p className="-mt-4 text-sm text-gray-500">
        A dine-in order from seating through payment and feedback, and the department that owns each step.
      </p>
      <Card className="p-6">
        <JourneyFlow steps={STEPS} />
      </Card>
    </div>
  );
}
