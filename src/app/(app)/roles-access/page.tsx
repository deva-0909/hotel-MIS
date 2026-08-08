import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, Breadcrumb } from "@/components/ui";

const ROLES: { code: string; scope: string; title: string; description: string }[] = [
  { code: "admin", scope: "Corporate", title: "Admin", description: "Chain-wide configuration, staff accounts, and full access across every module." },
  { code: "front_office", scope: "Property", title: "Front Office Staff", description: "Reservations, check-in/out, folio, room assignment." },
  { code: "housekeeping", scope: "Property", title: "Housekeeping", description: "Room status board, attendant assignment, inspection." },
  { code: "restaurant_manager", scope: "Property", title: "Restaurant Manager", description: "Oversees dine-in, parcel, own-delivery and aggregator order channels." },
  { code: "waiter", scope: "Property", title: "Captain / Waiter", description: "Dine-in order capture and table service." },
  { code: "chef", scope: "Property", title: "Kitchen / Chef", description: "Kitchen ticket queue, recipe costing, wastage entries." },
  { code: "inventory_manager", scope: "Property / Zone", title: "Purchase & Store Manager", description: "Requisitions, vendor quotes, purchase orders, goods receipt, stock issue." },
  { code: "engineering", scope: "Property", title: "Engineering & Maintenance", description: "Asset registry, work order queue, preventive maintenance scheduling." },
  { code: "hr", scope: "Property / Corporate", title: "HR Manager", description: "Attendance, leave, staff roster." },
  { code: "accountant", scope: "Property / Corporate", title: "Accounts Manager", description: "Billing, GST invoicing, payments, P&L." },
  { code: "crm_marketing", scope: "Property", title: "CRM & Marketing", description: "Campaigns, leads, loyalty program." },
  { code: "banquet", scope: "Property", title: "Banquet & Events", description: "Event bookings, venue availability, BEO." },
  { code: "spa_laundry", scope: "Property", title: "Spa & Laundry", description: "Spa scheduling and laundry batch tracking." },
  { code: "travel_desk", scope: "Property", title: "Travel Desk", description: "Guest transport and tour package bookings." },
];

export default async function RolesAccessPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const { data: profiles } = await supabase.from("profiles").select("role");
  const counts = new Map<string, number>();
  for (const p of profiles ?? []) counts.set(p.role, (counts.get(p.role) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, "Roles & Access"]} />
      <h1 className="text-xl text-gray-900">Roles &amp; Access</h1>
      <p className="-mt-4 text-sm text-gray-500">Who works in the system day to day, and what each role is responsible for.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROLES.map((r) => (
          <Card key={r.code} className="p-4">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent">{r.scope}</div>
            <div className="flex items-center justify-between">
              <div className="font-serif text-base text-gray-900">{r.title}</div>
              <span className="text-xs text-gray-400">{counts.get(r.code) ?? 0} on staff</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{r.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
