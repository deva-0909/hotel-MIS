"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createTravelBooking(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const guestId = formData.get("guest_id") as string | null;
  const { error } = await supabase.from("travel_bookings").insert({
    property_id: propertyId,
    guest_id: guestId || null,
    walk_in_name: guestId ? null : (formData.get("walk_in_name") as string) || null,
    service_type: String(formData.get("service_type")),
    vendor: (formData.get("vendor") as string) || null,
    vehicle_id: (formData.get("vehicle_id") as string) || null,
    scheduled_at: (formData.get("scheduled_at") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/travel-desk");
}

export async function updateTravelBookingStatus(
  bookingId: string,
  status: "inquiry" | "scheduled" | "confirmed" | "completed" | "cancelled",
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("travel_bookings").update({ status }).eq("id", bookingId);
  if (error) throw new Error(error.message);
  revalidatePath("/departments/travel-desk");
}
