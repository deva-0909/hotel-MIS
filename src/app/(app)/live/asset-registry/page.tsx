import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Breadcrumb, EmptyState, Input, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createAsset } from "@/app/actions/engineering";
import { AssetStatusControl } from "./asset-actions";

export default async function AssetRegistryPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: assets } = await supabase
    .from("engineering_assets")
    .select("id, asset_code, name, category, location, status, next_service_date")
    .eq("property_id", org.propertyId)
    .order("asset_code");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Asset Registry"]} />
      <h1 className="text-xl text-gray-900">Asset Registry</h1>
      <p className="-mt-4 text-sm text-gray-500">Engineering equipment tracked across the property.</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {!assets?.length ? (
            <EmptyState>No assets registered yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Asset ID</th>
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Category</th>
                  <th className="px-5 py-2 font-medium">Location</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Next Service</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{a.asset_code}</td>
                    <td className="px-5 py-2.5 text-gray-800">{a.name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{a.category}</td>
                    <td className="px-5 py-2.5 text-gray-600">{a.location ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <AssetStatusControl assetId={a.id} status={a.status} />
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{a.next_service_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Register equipment" />
          <form action={createAsset} className="space-y-2 p-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Rooftop AC Unit" />
            </div>
            <div>
              <Label>Category</Label>
              <Input name="category" required placeholder="e.g. HVAC" />
            </div>
            <div>
              <Label>Location</Label>
              <Input name="location" placeholder="e.g. Basement Plant Room" />
            </div>
            <div>
              <Label>Next service date</Label>
              <Input name="next_service_date" type="date" />
            </div>
            <SubmitButton>Register equipment</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
