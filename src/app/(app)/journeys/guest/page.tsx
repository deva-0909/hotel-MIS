import { getOrgContext } from "@/lib/org-context";
import { Card, Breadcrumb } from "@/components/ui";
import { JourneyFlow } from "@/components/journey-flow";

const STEPS = [
  { dept: "CRM & MARKETING", label: "Website" },
  { dept: "FRONT OFFICE", label: "Reservation" },
  { dept: "ACCOUNTS & FINANCE", label: "Payment" },
  { dept: "FRONT OFFICE", label: "Confirmation" },
  { dept: "FRONT OFFICE", label: "Arrival" },
  { dept: "FRONT OFFICE", label: "Check-in" },
  { dept: "FRONT OFFICE", label: "Room Allocation" },
  { dept: "HOUSEKEEPING", label: "Housekeeping" },
  { dept: "RESTAURANT", label: "Restaurant" },
  { dept: "SPA & LAUNDRY", label: "Spa" },
  { dept: "SPA & LAUNDRY", label: "Laundry" },
  { dept: "ROOM SERVICE", label: "Mini Bar" },
  { dept: "ENGINEERING & MAINTENANCE", label: "Maintenance" },
  { dept: "RESTAURANT", label: "Room Service" },
  { dept: "FRONT OFFICE", label: "Checkout" },
  { dept: "ACCOUNTS & FINANCE", label: "Invoice" },
  { dept: "CRM & MARKETING", label: "Feedback" },
  { dept: "CRM & MARKETING", label: "Loyalty" },
  { dept: "CRM & MARKETING", label: "Revisit" },
];

export default async function GuestJourneyPage() {
  const org = await getOrgContext();
  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Guest Journey"]} />
      <h1 className="text-xl text-gray-900">Guest Journey</h1>
      <p className="-mt-4 text-sm text-gray-500">
        The end-to-end path a guest travels through the property — every touchpoint maps to the department that owns it.
      </p>
      <Card className="p-6">
        <JourneyFlow steps={STEPS} />
      </Card>
    </div>
  );
}
