import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, EmptyState, Input, Select, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createLeaveRequest } from "@/app/actions/hr";
import { AttendanceCell, LeaveActionButtons } from "./attendance-actions";

const CODE_LABEL: Record<string, string> = { present: "P", absent: "A", leave: "L", week_off: "W" };

export default async function AttendanceCalendarPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const dates: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const [{ data: employees }, { data: records }, { data: leaves }] = await Promise.all([
    supabase.from("hr_employees").select("id, full_name").order("full_name"),
    supabase.from("attendance_records").select("employee_id, attendance_date, status").in("attendance_date", dates),
    supabase
      .from("leave_requests")
      .select("id, leave_type, start_date, end_date, status, hr_employees(full_name)")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const recordMap = new Map<string, string>();
  for (const r of records ?? []) recordMap.set(`${r.employee_id}_${r.attendance_date}`, r.status);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Attendance Calendar"]} />
      <h1 className="text-xl text-gray-900">Attendance Calendar</h1>
      <p className="-mt-4 text-sm text-gray-500">This week&apos;s attendance across departments.</p>

      <Card className="overflow-x-auto">
        {!employees?.length ? (
          <EmptyState>No employees added yet. Add staff from Human Resources.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                <th className="whitespace-nowrap px-4 py-2 font-medium">Employee</th>
                {dates.map((d) => (
                  <th key={d} className="px-2 py-2 text-center font-medium">
                    {new Date(d).toLocaleDateString([], { day: "2-digit", month: "short" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0">
                  <td className="whitespace-nowrap px-4 py-1.5 font-medium text-gray-800">{e.full_name}</td>
                  {dates.map((d) => (
                    <td key={d} className="px-1 py-1 text-center">
                      <AttendanceCell
                        employeeId={e.id}
                        date={d}
                        code={recordMap.get(`${e.id}_${d}`) ? CODE_LABEL[recordMap.get(`${e.id}_${d}`)!] : "—"}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Leave requests" />
          {!leaves?.length ? (
            <EmptyState>No leave requests yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Employee</th>
                  <th className="px-5 py-2 font-medium">Type</th>
                  <th className="px-5 py-2 font-medium">Dates</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 text-gray-800">{l.hr_employees?.full_name}</td>
                    <td className="px-5 py-2.5 capitalize text-gray-600">{l.leave_type}</td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {l.start_date} → {l.end_date}
                    </td>
                    <td className="px-5 py-2.5">
                      {l.status === "pending" ? (
                        <LeaveActionButtons leaveId={l.id} />
                      ) : (
                        <Badge color={l.status === "approved" ? "green" : "red"}>{l.status}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Request leave" />
          <form action={createLeaveRequest} className="space-y-2 p-4">
            <div>
              <Label>Employee</Label>
              <Select name="employee_id" required>
                <option value="">Select employee…</option>
                {employees?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select name="leave_type" defaultValue="casual">
                <option value="sick">Sick</option>
                <option value="casual">Casual</option>
                <option value="earned">Earned</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>From</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div>
                <Label>To</Label>
                <Input name="end_date" type="date" required />
              </div>
            </div>
            <SubmitButton>Submit request</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
