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

// Same idea as updateOwnRole but for the staff member's home property —
// lets one demo account preview any property's data. Real RLS still applies:
// non-admin roles are hard-scoped to whichever property_id this sets, admin
// sees every property regardless of it.
export async function updateOwnProperty(propertyId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ property_id: propertyId }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function toggleStaffActive(staffId: string, active: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", staffId);
  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}

export async function updateStaffProperty(staffId: string, propertyId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("profiles").update({ property_id: propertyId }).eq("id", staffId);
  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}
