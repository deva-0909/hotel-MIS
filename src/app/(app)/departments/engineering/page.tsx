import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, StatTile, EmptyState, Input, Select, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createWorkOrder } from "@/app/actions/engineering";
import { AssignedToControl, WorkOrderStatusControl } from "./engineering-actions";

const PRIORITY_COLOR: Record<string, "green" | "amber" | "red"> = { low: "green", medium: "amber", high: "red" };

export default async function EngineeringDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: workOrders }, { data: assets }] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, wo_number, location, issue, priority, status, assigned_to")
      .eq("property_id", org.propertyId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("engineering_assets").select("id, name, status").eq("property_id", org.propertyId),
  ]);

  const openCount = workOrders?.filter((w) => w.status !== "resolved").length ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Engineering & Maintenance"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          EM
        </span>
        <h1 className="text-xl text-gray-900">Engineering &amp; Maintenance</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Open Work Orders" value={openCount} />
        <StatTile label="Assets Tracked" value={assets?.length ?? 0} />
        <StatTile
          label="Needs Attention"
          value={assets?.filter((a) => a.status === "needs_attention" || a.status === "under_maintenance").length ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Work order queue" />
          {!workOrders?.length ? (
            <EmptyState>No work orders yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">WO #</th>
                  <th className="px-5 py-2 font-medium">Location</th>
                  <th className="px-5 py-2 font-medium">Issue</th>
                  <th className="px-5 py-2 font-medium">Priority</th>
                  <th className="px-5 py-2 font-medium">Assigned To</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{wo.wo_number}</td>
                    <td className="px-5 py-2.5 text-gray-600">{wo.location}</td>
                    <td className="px-5 py-2.5 text-gray-600">{wo.issue}</td>
                    <td className="px-5 py-2.5">
                      <Badge color={PRIORITY_COLOR[wo.priority]}>{wo.priority}</Badge>
                    </td>
                    <td className="px-5 py-2.5">
                      <AssignedToControl workOrderId={wo.id} assignedTo={wo.assigned_to} />
                    </td>
                    <td className="px-5 py-2.5">
                      <WorkOrderStatusControl workOrderId={wo.id} status={wo.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Log work order" />
          <form action={createWorkOrder} className="space-y-2 p-4">
            <div>
              <Label>Location</Label>
              <Input name="location" required placeholder="e.g. Room 308" />
            </div>
            <div>
              <Label>Issue</Label>
              <Input name="issue" required placeholder="e.g. AC not cooling" />
            </div>
            <div>
              <Label>Priority</Label>
              <Select name="priority" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
            <SubmitButton>Log work order</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
