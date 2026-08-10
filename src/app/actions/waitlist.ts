"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";

export async function createWaitlistEntry(formData: FormData) {
  const { supabase, user, propertyId } = await requireUser();

  let guestId = formData.get("guest_id") as string | null;
  if (!guestId) {
    const newName = formData.get("new_guest_name") as string | null;
    if (!newName) throw new Error("Select a guest or enter a new guest name");
    const newPhone = (formData.get("new_guest_phone") as string) || null;

    if (newPhone) {
      const { data: existing } = await supabase.from("guests").select("id").eq("phone", newPhone).maybeSingle();
      if (existing) guestId = existing.id;
    }
    if (!guestId) {
      const { data, error } = await supabase
        .from("guests")
        .insert({ full_name: newName, phone: newPhone, created_by: user.id })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      guestId = data.id;
    }
  }

  const { error } = await supabase.from("waitlist_entries").insert({
    property_id: propertyId,
    guest_id: guestId,
    room_type_id: String(formData.get("room_type_id")),
    requested_check_in: String(formData.get("requested_check_in")),
    requested_check_out: String(formData.get("requested_check_out")),
    party_size: Number(formData.get("party_size") ?? 1),
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/waitlist");
}

export async function cancelWaitlistEntry(entryId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("waitlist_entries").update({ status: "cancelled" }).eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/waitlist");
}

// Turns a waiting entry into a real reservation once a room's actually
// available, and marks the entry converted so it drops off the active list.
export async function convertWaitlistEntry(entryId: string, formData: FormData) {
  const { supabase, user, propertyId } = await requireUser();

  const { data: entry, error: fetchError } = await supabase
    .from("waitlist_entries")
    .select("guest_id, room_type_id, requested_check_in, requested_check_out, party_size, status")
    .eq("id", entryId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (entry.status !== "waiting") throw new Error("This waitlist entry has already been resolved.");

  const roomId = (formData.get("room_id") as string) || null;
  if (roomId) {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("status")
      .eq("id", roomId)
      .eq("property_id", propertyId)
      .maybeSingle();
    if (roomError) throw new Error(roomError.message);
    if (!room || !["available", "dirty"].includes(room.status)) {
      throw new Error("This room is no longer available. Pick a different room.");
    }
  }

  const { data: roomType } = await supabase.from("room_types").select("base_rate").eq("id", entry.room_type_id).single();

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      property_id: propertyId,
      guest_id: entry.guest_id,
      room_id: roomId,
      room_type_id: entry.room_type_id,
      check_in_date: entry.requested_check_in,
      check_out_date: entry.requested_check_out,
      adults: entry.party_size,
      rate_per_night: roomType?.base_rate ?? 0,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (reservationError) throw new Error(reservationError.message);

  const { error } = await supabase.from("waitlist_entries").update({ status: "converted" }).eq("id", entryId);
  if (error) throw new Error(error.message);

  revalidatePath("/waitlist");
  revalidatePath("/reservations");
  revalidatePath("/rooms");
  redirect(`/reservations/${reservation.id}`);
}
