import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, EmptyState, Input, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createProperty } from "@/app/actions/property";

export default async function PropertiesPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, code, city, is_active, buildings(count), restaurants(count)")
    .order("name");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, "Properties"]} />
      <h1 className="text-xl text-gray-900">Properties</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Every property the enterprise operates. Each has its own buildings, floors, room types, and restaurant
        outlets.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`All properties (${properties?.length ?? 0})`} />
          {!properties?.length ? (
            <EmptyState>No properties yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Property</th>
                  <th className="px-5 py-2 font-medium">Code</th>
                  <th className="px-5 py-2 font-medium">City</th>
                  <th className="px-5 py-2 font-medium">Buildings</th>
                  <th className="px-5 py-2 font-medium">Restaurants</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">
                      <Link href={`/organization/properties/${p.id}`} className="hover:text-accent hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{p.code}</td>
                    <td className="px-5 py-2.5 text-gray-600">{p.city ?? "—"}</td>
                    <td className="px-5 py-2.5 text-gray-600">{p.buildings?.[0]?.count ?? 0}</td>
                    <td className="px-5 py-2.5 text-gray-600">{p.restaurants?.[0]?.count ?? 0}</td>
                    <td className="px-5 py-2.5">
                      <Badge color={p.is_active ? "green" : "gray"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Add property" />
          <form action={createProperty} className="space-y-2 p-4">
            <div>
              <Label>Name</Label>
              <Input name="name" required placeholder="e.g. Jaipur Palace" />
            </div>
            <div>
              <Label>Code</Label>
              <Input name="code" required placeholder="e.g. JAI" maxLength={10} />
            </div>
            <div>
              <Label>City</Label>
              <Input name="city" />
            </div>
            <div>
              <Label>Address</Label>
              <Input name="address" />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input name="gstin" />
            </div>
            <SubmitButton>Add property</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
