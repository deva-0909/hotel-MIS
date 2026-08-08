import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, StatTile, EmptyState, Input, Select, Label, Button } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createEmployee } from "@/app/actions/hr";

export default async function HrDepartmentPage() {
  const supabase = await createClient();
  const org = await getOrgContext();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: employees }, { data: leaves }, { data: todayAttendance }] = await Promise.all([
    supabase.from("hr_employees").select("id, full_name, department, role_title, status").order("full_name"),
    supabase.from("leave_requests").select("id, status").eq("status", "pending"),
    supabase.from("attendance_records").select("status").eq("attendance_date", today),
  ]);

  const present = todayAttendance?.filter((a) => a.status === "present").length ?? 0;
  const attendancePct = todayAttendance?.length ? Math.round((present / todayAttendance.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Human Resources"]} />
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-9 items-center justify-center rounded border border-accent/40 text-xs font-medium text-accent">
          HR
        </span>
        <h1 className="text-xl text-gray-900">Human Resources</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Headcount" value={employees?.length ?? 0} />
        <StatTile label="Attendance Today" value={`${attendancePct}%`} />
        <StatTile label="Leave Requests" value={leaves?.length ?? 0} sub="pending approval" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Staff roster" />
          {!employees?.length ? (
            <EmptyState>No employees added yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Employee</th>
                  <th className="px-5 py-2 font-medium">Department</th>
                  <th className="px-5 py-2 font-medium">Role</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{e.full_name}</td>
                    <td className="px-5 py-2.5 text-gray-600">{e.department}</td>
                    <td className="px-5 py-2.5 text-gray-600">{e.role_title ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <Badge color={e.status === "active" ? "green" : e.status === "on_leave" ? "amber" : "gray"}>
                        {e.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-black/10 px-5 py-3">
            <Link href="/live/attendance">
              <Button variant="secondary">Attendance Calendar</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="Add employee" />
          <form action={createEmployee} className="space-y-2 p-4">
            <div>
              <Label>Full name</Label>
              <Input name="full_name" required />
            </div>
            <div>
              <Label>Department</Label>
              <Select name="department" required>
                <option value="Front Office">Front Office</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Stores & Purchase">Stores &amp; Purchase</option>
                <option value="Engineering">Engineering</option>
                <option value="HR">HR</option>
                <option value="Accounts & Finance">Accounts &amp; Finance</option>
                <option value="CRM & Marketing">CRM &amp; Marketing</option>
                <option value="Banquet & Events">Banquet &amp; Events</option>
                <option value="Spa & Laundry">Spa &amp; Laundry</option>
                <option value="Travel Desk">Travel Desk</option>
              </Select>
            </div>
            <div>
              <Label>Role / title</Label>
              <Input name="role_title" placeholder="e.g. Shift Supervisor" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" />
            </div>
            <SubmitButton>Add employee</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
