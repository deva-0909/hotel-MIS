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

export async function createEvent(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("banquet_events").insert({
    event_name: String(formData.get("event_name")),
    client_name: String(formData.get("client_name")),
    venue_id: (formData.get("venue_id") as string) || null,
    covers: Number(formData.get("covers") ?? 0),
    event_date: String(formData.get("event_date")),
    value_amount: Number(formData.get("value_amount") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/banquet");
}

export async function updateEventStatus(eventId: string, status: "tentative" | "confirmed" | "completed" | "cancelled") {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("banquet_events").update({ status }).eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/departments/banquet");
}

export async function createVenue(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("banquet_venues").insert({
    name: String(formData.get("name")),
    capacity: Number(formData.get("capacity") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/banquet");
}
