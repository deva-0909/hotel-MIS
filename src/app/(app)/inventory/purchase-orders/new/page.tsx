import { createClient } from "@/lib/supabase/server";
import { createPurchaseOrder } from "@/app/actions/inventory";
import { Card, CardHeader, Input, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id, name").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">New purchase order</h1>
      <Card className="max-w-lg">
        <CardHeader title="Purchase order details" />
        <form action={createPurchaseOrder} className="space-y-3 px-5 py-5">
          <div>
            <Label>Supplier</Label>
            <Select name="supplier_id" required>
              <option value="">Select supplier…</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Expected date</Label>
            <Input name="expected_date" type="date" />
          </div>
          <div>
            <Label>Notes</Label>
            <Input name="notes" />
          </div>
          <SubmitButton>Create purchase order</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
