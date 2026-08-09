import { createClient } from "@/lib/supabase/server";

// Every property-scoped server action needs the signed-in user plus their
// home property id (for inserts/filters) — shared here instead of each
// actions file re-fetching the profile.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase.from("profiles").select("property_id").eq("id", user.id).maybeSingle();
  if (!profile?.property_id) throw new Error("Your account has no property assigned. Ask an admin to set one.");

  return { supabase, user, propertyId: profile.property_id };
}
