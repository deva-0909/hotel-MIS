import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { createTaxRate } from "@/app/actions/tax";
import { Card, CardHeader, Badge, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { TaxRateActiveToggle } from "./tax-rate-actions";

const APPLIES_TO_LABEL: Record<string, string> = {
  room: "Room",
  restaurant: "Restaurant / F&B",
  service: "Service",
  misc: "Miscellaneous",
  all: "Everything",
};

export default async function TaxRatesPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: taxRates } = await supabase
    .from("tax_rates")
    .select("id, name, rate_percent, applies_to, is_active")
    .eq("property_id", org.propertyId)
    .order("applies_to");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Tax Rates"]} />
      <h1 className="text-xl text-gray-900">Tax Rates</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Applied automatically to every invoice — line items are matched by type (room, restaurant, service, misc)
        and taxed by whichever active rates apply. Multiple rates on the same type stack (e.g. CGST 6% + SGST 6%
        instead of one combined 12% row).
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Rates (${taxRates?.length ?? 0})`} />
          {!taxRates?.length ? (
            <EmptyState>No tax rates configured yet — invoices will have zero tax until you add one.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Applies to</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {taxRates.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2 font-medium text-gray-900">{t.name}</td>
                    <td className="px-3 py-2">
                      <Badge color="blue">{APPLIES_TO_LABEL[t.applies_to] ?? t.applies_to}</Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{t.rate_percent}%</td>
                    <td className="px-3 py-2">
                      <TaxRateActiveToggle taxRateId={t.id} isActive={t.is_active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add tax rate" />
          <form action={createTaxRate} className="space-y-2 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. CGST" />
            </div>
            <div>
              <Label>Applies to</Label>
              <Select name="applies_to" required defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                <option value="room">Room</option>
                <option value="restaurant">Restaurant / F&amp;B</option>
                <option value="service">Service</option>
                <option value="misc">Miscellaneous</option>
                <option value="all">Everything</option>
              </Select>
            </div>
            <div>
              <Label>Rate %</Label>
              <Input name="rate_percent" type="number" min={0} max={100} step="0.01" required />
            </div>
            <SubmitButton>Add rate</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
