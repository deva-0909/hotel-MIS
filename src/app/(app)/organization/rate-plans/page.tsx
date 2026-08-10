import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { formatMoney } from "@/lib/format-money";
import { createRatePlan } from "@/app/actions/rate-plans";
import { RatePlanActiveToggle } from "./rate-plan-actions";

export default async function RatePlansPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: ratePlans }, { data: roomTypes }] = await Promise.all([
    supabase.from("rate_plans").select("id, name, base_rate, is_active, room_types(name)").eq("property_id", org.propertyId).order("name"),
    supabase.from("room_types").select("id, name").eq("property_id", org.propertyId).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Rate Plans"]} />
      <h1 className="text-xl text-gray-900">Rate Plans</h1>
      <p className="-mt-4 text-sm text-gray-500">
        A room type can sell under more than one rate plan (e.g. Best Available Rate, Non-refundable, Corporate) —
        each can be mapped to a different channel with its own price on Organization → Channels.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Rate plans (${ratePlans?.length ?? 0})`} />
          {!ratePlans?.length ? (
            <EmptyState>No rate plans yet — every room type is still selling only at its flat base rate.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Room type</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ratePlans.map((rp) => (
                  <tr key={rp.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2 font-medium text-gray-900">{rp.name}</td>
                    <td className="px-3 py-2 text-gray-700">{rp.room_types?.name}</td>
                    <td className="px-3 py-2 text-gray-700">{formatMoney(rp.base_rate, org.currency)}</td>
                    <td className="px-3 py-2">
                      <RatePlanActiveToggle ratePlanId={rp.id} isActive={rp.is_active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add rate plan" />
          <form action={createRatePlan} className="space-y-2 px-5 py-4">
            <div>
              <Label>Room type</Label>
              <Select name="room_type_id" required>
                {roomTypes?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Non-refundable" />
            </div>
            <div>
              <Label>Rate/night</Label>
              <Input name="base_rate" type="number" min={0} step="0.01" required />
            </div>
            <SubmitButton variant="secondary">Add rate plan</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
