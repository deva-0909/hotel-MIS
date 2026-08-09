"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createSpaBooking(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const guestId = formData.get("guest_id") as string | null;
  const { error } = await supabase.from("spa_bookings").insert({
    property_id: propertyId,
    guest_id: guestId || null,
    walk_in_name: guestId ? null : (formData.get("walk_in_name") as string) || null,
    service_id: String(formData.get("service_id")),
    therapist: (formData.get("therapist") as string) || null,
    scheduled_at: String(formData.get("scheduled_at")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/spa-laundry");
}

export async function updateSpaBookingStatus(bookingId: string, status: "booked" | "in_progress" | "completed" | "cancelled") {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("spa_bookings").update({ status }).eq("id", bookingId);
  if (error) throw new Error(error.message);
  revalidatePath("/departments/spa-laundry");
}

export async function createLaundryBatch(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("laundry_batches").insert({
    property_id: propertyId,
    room_id: (formData.get("room_id") as string) || null,
    item_count: Number(formData.get("item_count") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/spa-laundry");
}

export async function updateLaundryStatus(batchId: string, status: "collected" | "in_process" | "ready" | "delivered") {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("laundry_batches").update({ status }).eq("id", batchId);
  if (error) throw new Error(error.message);
  revalidatePath("/departments/spa-laundry");
}
