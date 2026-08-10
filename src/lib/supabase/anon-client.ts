import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// For routes with no staff session to read cookies from (inbound OTA
// webhooks, the public iCal feed) — plain anon-key client, no auth
// context. Every write these routes make goes through a SECURITY DEFINER
// RPC scoped to a specific channel_connection_id instead of relying on
// RLS, since there's no auth.uid() here for is_staff_for_property() to
// check.
export function createAnonClient() {
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
