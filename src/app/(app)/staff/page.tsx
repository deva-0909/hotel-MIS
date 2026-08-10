import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, Badge, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActiveToggle, RoleSelect, PropertySelect, RevokeInviteButton, ALL_ROLES } from "@/components/staff-controls";
import { createInvite } from "@/app/actions/invites";

export default async function StaffPage() {
  const supabase = await createClient();
  const [{ data: staff }, { data: properties }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, phone, active, property_id").order("full_name"),
    supabase.from("properties").select("id, name").order("name"),
    supabase
      .from("staff_invites")
      .select("id, email, role, status, created_at, properties(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Staff</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={`All staff (${staff?.length ?? 0})`} />
            {!staff?.length ? (
              <EmptyState>No staff members yet.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                    <th className="px-5 py-2 font-medium">Name</th>
                    <th className="px-5 py-2 font-medium">Phone</th>
                    <th className="px-5 py-2 font-medium">Role</th>
                    <th className="px-5 py-2 font-medium">Property</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 font-medium text-gray-900">{s.full_name}</td>
                      <td className="px-5 py-2.5 text-gray-600">{s.phone ?? "—"}</td>
                      <td className="px-5 py-2.5">
                        <RoleSelect staffId={s.id} role={s.role} />
                      </td>
                      <td className="px-5 py-2.5">
                        <PropertySelect staffId={s.id} propertyId={s.property_id} properties={properties ?? []} />
                      </td>
                      <td className="px-5 py-2.5">
                        <ActiveToggle staffId={s.id} active={s.active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card>
            <CardHeader title={`Pending invites (${invites?.length ?? 0})`} />
            {!invites?.length ? (
              <EmptyState>No pending invites.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 font-medium text-gray-900">{inv.email}</td>
                      <td className="px-5 py-2.5">
                        <Badge color="blue">{inv.role.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-5 py-2.5 text-gray-600">{inv.properties?.name ?? "Any property"}</td>
                      <td className="px-5 py-2.5 text-right">
                        <RevokeInviteButton inviteId={inv.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Invite staff" />
          <p className="px-5 pt-3 text-xs text-gray-500">
            The invited email gets exactly this role and property the moment they register — self-signup with an
            arbitrary role is no longer possible.
          </p>
          <form action={createInvite} className="space-y-2 px-5 py-4">
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" required placeholder="new.staff@example.com" />
            </div>
            <div>
              <Label>Role</Label>
              <Select name="role" defaultValue="front_office">
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Property</Label>
              <Select name="property_id" defaultValue="">
                <option value="">Any property (assign later)</option>
                {properties?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <SubmitButton>Send invite</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
