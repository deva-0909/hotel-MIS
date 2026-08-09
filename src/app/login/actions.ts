"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type StaffRole = Database["public"]["Enums"]["staff_role"];

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  const role = String(formData.get("role") ?? "admin") as StaffRole;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  if (!data.user) {
    return { error: null, needsConfirmation: true };
  }

  const { data: firstProperty } = await supabase.from("properties").select("id").order("created_at").limit(1).maybeSingle();

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    role,
    property_id: firstProperty?.id ?? null,
  });
  if (profileError) return { error: profileError.message };

  return { error: null, needsConfirmation: !data.session };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
