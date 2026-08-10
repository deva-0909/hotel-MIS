import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, Input, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createTravelAgent } from "@/app/actions/travel-agents";
import { TravelAgentActiveToggle } from "./travel-agent-actions";

export default async function TravelAgentsPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: agents } = await supabase
    .from("travel_agents")
    .select("id, name, contact_email, contact_phone, default_commission_percent, is_active")
    .order("name");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, "Travel Agents"]} />
      <h1 className="text-xl text-gray-900">Travel Agents</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Agents/OTAs whose bookings earn commission — the default rate here pre-fills each booking&apos;s commission, and
        can be overridden per booking.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Agents (${agents?.length ?? 0})`} />
          {!agents?.length ? (
            <EmptyState>No travel agents yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Contact</th>
                  <th className="px-3 py-2 font-medium">Default commission</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2 font-medium text-gray-900">{a.name}</td>
                    <td className="px-3 py-2 text-gray-700">{a.contact_email ?? a.contact_phone ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{a.default_commission_percent}%</td>
                    <td className="px-3 py-2">
                      <TravelAgentActiveToggle agentId={a.id} isActive={a.is_active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add agent" />
          <form action={createTravelAgent} className="space-y-2 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. MakeMyTrip" />
            </div>
            <div>
              <Label>Contact email (optional)</Label>
              <Input name="contact_email" type="email" />
            </div>
            <div>
              <Label>Contact phone (optional)</Label>
              <Input name="contact_phone" />
            </div>
            <div>
              <Label>Default commission %</Label>
              <Input name="default_commission_percent" type="number" min={0} max={100} step="0.01" defaultValue={0} />
            </div>
            <SubmitButton variant="secondary">Add agent</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
