import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, StatTile, EmptyState, Input, Select, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createCampaign, createLead } from "@/app/actions/crm";
import { CampaignStatusControl } from "./crm-actions";

export default async function CrmDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const monthStart = new Date();
  monthStart.setDate(1);

  const [{ data: campaigns }, { data: leads }, { data: loyaltyGuests }] = await Promise.all([
    supabase
      .from("crm_campaigns")
      .select("id, name, channel, audience, status")
      .eq("property_id", org.propertyId)
      .order("created_at", { ascending: false }),
    supabase.from("crm_leads").select("id").eq("property_id", org.propertyId).gte("created_at", monthStart.toISOString()),
    supabase.from("guests").select("id").not("loyalty_tier", "is", null),
  ]);

  const liveCampaigns = campaigns?.filter((c) => c.status === "live").length ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "CRM & Marketing"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          CM
        </span>
        <h1 className="text-xl text-gray-900">CRM &amp; Marketing</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Active Campaigns" value={liveCampaigns} />
        <StatTile label="Leads This Month" value={leads?.length ?? 0} />
        <StatTile label="Loyalty Members" value={loyaltyGuests?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Campaigns" />
          {!campaigns?.length ? (
            <EmptyState>No campaigns yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Campaign</th>
                  <th className="px-5 py-2 font-medium">Channel</th>
                  <th className="px-5 py-2 font-medium">Audience</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{c.name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{c.channel}</td>
                    <td className="px-5 py-2.5 text-gray-600">{c.audience}</td>
                    <td className="px-5 py-2.5">
                      <CampaignStatusControl campaignId={c.id} status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Launch campaign" />
            <form action={createCampaign} className="space-y-2 p-4">
              <div>
                <Label>Name</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>Channel</Label>
                <Select name="channel" defaultValue="Email">
                  <option>Email</option>
                  <option>Social</option>
                  <option>Direct Sales</option>
                  <option>SMS</option>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Input name="audience" placeholder="e.g. Loyalty Tier Gold" required />
              </div>
              <SubmitButton>Launch</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Add lead" />
            <form action={createLead} className="space-y-2 p-4">
              <div>
                <Label>Name</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>Source</Label>
                <Input name="source" placeholder="e.g. Website" />
              </div>
              <SubmitButton variant="secondary">Add lead</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
