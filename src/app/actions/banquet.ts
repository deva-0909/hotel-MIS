"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

function formatRange(startAt: string, endAt: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return `${fmt(startAt)} – ${fmt(endAt)}`;
}

export async function createEvent(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const venueId = (formData.get("venue_id") as string) || null;
  const startAt = String(formData.get("start_at"));
  const endAt = String(formData.get("end_at"));

  if (new Date(endAt) <= new Date(startAt)) {
    throw new Error("End time must be after the start time.");
  }

  if (venueId) {
    const { data: conflicts, error: conflictError } = await supabase.rpc("banquet_venue_conflicts", {
      p_venue_id: venueId,
      p_start_at: startAt,
      p_end_at: endAt,
    });
    if (conflictError) throw new Error(conflictError.message);
    if (conflicts?.length) {
      const c = conflicts[0];
      throw new Error(
        `This venue is already booked for "${c.event_name}" (${formatRange(c.start_at, c.end_at)}, including setup/teardown buffer). Pick a different time or venue.`,
      );
    }
  }

  const { error } = await supabase.from("banquet_events").insert({
    property_id: propertyId,
    event_name: String(formData.get("event_name")),
    client_name: String(formData.get("client_name")),
    venue_id: venueId,
    covers: Number(formData.get("covers") ?? 0),
    start_at: startAt,
    end_at: endAt,
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
  revalidatePath(`/departments/banquet/${eventId}`);
}

export async function createVenue(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("banquet_venues").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
    capacity: Number(formData.get("capacity") ?? 0),
    buffer_minutes: Number(formData.get("buffer_minutes") ?? 60),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/banquet");
}

export async function createMenuPackage(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("banquet_menu_packages").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
    description: (formData.get("description") as string) || null,
    price_per_cover: Number(formData.get("price_per_cover") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/banquet");
}

export async function addEventMenuItem(eventId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("banquet_event_items").insert({
    event_id: eventId,
    package_id: String(formData.get("package_id")),
    covers: Number(formData.get("covers") ?? 0),
    notes: (formData.get("notes") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/departments/banquet/${eventId}`);
}

export async function removeEventMenuItem(eventId: string, itemId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("banquet_event_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/departments/banquet/${eventId}`);
}
