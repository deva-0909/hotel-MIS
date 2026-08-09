import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { createTransfer } from "@/app/actions/transfers";
import { Card, CardHeader, Input, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function NewTransferPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .neq("id", org.propertyId)
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">New inventory transfer</h1>
      <Card className="max-w-lg">
        <CardHeader title="Transfer details" />
        <form action={createTransfer} className="space-y-3 px-5 py-5">
          <div>
            <Label>Direction</Label>
            <Select name="direction" defaultValue="send">
              <option value="send">Send stock to another property</option>
              <option value="request">Request stock from another property</option>
            </Select>
          </div>
          <div>
            <Label>Other property</Label>
            <Select name="counterparty_property_id" required>
              <option value="">Select property…</option>
              {properties?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Input name="notes" />
          </div>
          <SubmitButton>Create transfer</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
