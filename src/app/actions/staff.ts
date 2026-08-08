"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type StaffRole = Database["public"]["Enums"]["staff_role"];

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function updateStaffRole(staffId: string, role: StaffRole) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", staffId);
  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}

// Lets the signed-in user switch their own demo role for client walkthroughs —
// changes what the sidebar shows, not real permissions (RLS stays staff-wide).
export async function updateOwnRole(role: StaffRole) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function toggleStaffActive(staffId: string, active: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", staffId);
  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}
