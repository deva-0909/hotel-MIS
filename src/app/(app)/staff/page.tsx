import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { ActiveToggle, RoleSelect } from "@/components/staff-controls";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: staff } = await supabase.from("profiles").select("id, full_name, role, phone, active").order("full_name");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Staff</h1>

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
                    <ActiveToggle staffId={s.id} active={s.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
