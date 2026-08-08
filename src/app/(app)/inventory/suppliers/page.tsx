import { createClient } from "@/lib/supabase/server";
import { createSupplier } from "@/app/actions/inventory";
import { Card, CardHeader, Input, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id, name, contact_person, phone, email").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Suppliers</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`All suppliers (${suppliers?.length ?? 0})`} />
          {!suppliers?.length ? (
            <EmptyState>No suppliers yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Contact</th>
                  <th className="px-5 py-2 font-medium">Phone</th>
                  <th className="px-5 py-2 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{s.name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{s.contact_person ?? "—"}</td>
                    <td className="px-5 py-2.5 text-gray-600">{s.phone ?? "—"}</td>
                    <td className="px-5 py-2.5 text-gray-600">{s.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add supplier" />
          <form action={createSupplier} className="space-y-2 px-5 py-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Contact person</Label>
              <Input name="contact_person" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" />
            </div>
            <div>
              <Label>Address</Label>
              <Input name="address" />
            </div>
            <SubmitButton>Add supplier</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
