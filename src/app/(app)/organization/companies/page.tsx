import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, Input, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createCompany } from "@/app/actions/companies";
import { CompanyActiveToggle } from "./company-actions";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, gstin, contact_email, contact_phone, is_active")
    .order("name");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, "Companies"]} />
      <h1 className="text-xl text-gray-900">Corporate Accounts</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Companies that can be billed for staff/guest stays — pick one when creating a corporate booking.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Companies (${companies?.length ?? 0})`} />
          {!companies?.length ? (
            <EmptyState>No corporate accounts yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">GSTIN</th>
                  <th className="px-3 py-2 font-medium">Contact</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2 font-medium text-gray-900">{c.name}</td>
                    <td className="px-3 py-2 text-gray-700">{c.gstin ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{c.contact_email ?? c.contact_phone ?? "—"}</td>
                    <td className="px-3 py-2">
                      <CompanyActiveToggle companyId={c.id} isActive={c.is_active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add company" />
          <form action={createCompany} className="space-y-2 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <Label>GSTIN (optional)</Label>
              <Input name="gstin" />
            </div>
            <div>
              <Label>Billing address (optional)</Label>
              <Input name="billing_address" />
            </div>
            <div>
              <Label>Contact email (optional)</Label>
              <Input name="contact_email" type="email" />
            </div>
            <div>
              <Label>Contact phone (optional)</Label>
              <Input name="contact_phone" />
            </div>
            <SubmitButton variant="secondary">Add company</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
