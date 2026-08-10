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

// Re-inviting an email that already has a pending invite updates it in
// place (fresh role/property, bumped created_at) rather than erroring —
// the DB's partial unique index (one pending invite per email) blocks a
// second insert, so this checks first instead of relying on ON CONFLICT
// (which can't target a partial expression index via supabase-js).
export async function createInvite(formData: FormData) {
  const { supabase, user } = await requireUser();
  const email = String(formData.get("email")).trim().toLowerCase();
  const role = String(formData.get("role")) as StaffRole;
  const propertyId = (formData.get("property_id") as string) || null;

  const { data: existing } = await supabase
    .from("staff_invites")
    .select("id")
    .eq("status", "pending")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("staff_invites")
      .update({ role, property_id: propertyId, invited_by: user.id, created_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("staff_invites").insert({ email, role, property_id: propertyId, invited_by: user.id });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/staff");
}

export async function revokeInvite(inviteId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("staff_invites").update({ status: "revoked" }).eq("id", inviteId);
  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}
