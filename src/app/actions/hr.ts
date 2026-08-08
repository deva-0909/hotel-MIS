"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function createEmployee(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("hr_employees").insert({
    full_name: String(formData.get("full_name")),
    department: String(formData.get("department")),
    role_title: (formData.get("role_title") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/hr");
  revalidatePath("/live/attendance");
}

export async function markAttendance(employeeId: string, date: string, status: "present" | "absent" | "leave" | "week_off") {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("attendance_records")
    .upsert({ employee_id: employeeId, attendance_date: date, status }, { onConflict: "employee_id,attendance_date" });
  if (error) throw new Error(error.message);
  revalidatePath("/live/attendance");
  revalidatePath("/departments/hr");
}

export async function createLeaveRequest(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("leave_requests").insert({
    employee_id: String(formData.get("employee_id")),
    leave_type: String(formData.get("leave_type")),
    start_date: String(formData.get("start_date")),
    end_date: String(formData.get("end_date")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/live/attendance");
  revalidatePath("/departments/hr");
}

export async function updateLeaveRequest(leaveId: string, status: "approved" | "rejected") {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("leave_requests").update({ status }).eq("id", leaveId);
  if (error) throw new Error(error.message);
  revalidatePath("/live/attendance");
  revalidatePath("/departments/hr");
}
