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

// Signup no longer lets the caller pick their own role — that let anyone
// self-register as admin. Instead, resolve_signup (SECURITY DEFINER) checks
// for a matching pending invite and grants exactly that invite's role/
// property, or — only if this is the very first account in an empty
// system — allows a one-time bootstrap admin. Everyone else is rejected
// until an admin invites them from Staff Accounts.
export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  if (!data.user) {
    return { error: null, needsConfirmation: true };
  }

  const { data: resolved, error: resolveError } = await supabase.rpc("resolve_signup", { p_email: email });
  if (resolveError) return { error: resolveError.message };
  const decision = resolved?.[0];

  if (!decision?.allowed) {
    return { error: "This email hasn't been invited. Ask an admin to send you an invite from Staff Accounts." };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    role: decision.role as StaffRole,
    property_id: decision.property_id,
  });
  if (profileError) return { error: profileError.message };

  return { error: null, needsConfirmation: !data.session };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
