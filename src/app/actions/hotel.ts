"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import type { Database } from "@/lib/database.types";

type RoomStatus = Database["public"]["Enums"]["room_status"];

export async function createRoomType(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("room_types").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
    base_rate: Number(formData.get("base_rate") ?? 0),
    max_occupancy: Number(formData.get("max_occupancy") ?? 2),
    description: (formData.get("description") as string) || null,
    amenities: (formData.get("amenities") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/rooms");
}

export async function createRoom(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const floorId = String(formData.get("floor_id"));
  const { data: floor, error: floorError } = await supabase.from("floors").select("building_id").eq("id", floorId).single();
  if (floorError) throw new Error(floorError.message);

  const { error } = await supabase.from("rooms").insert({
    property_id: propertyId,
    building_id: floor.building_id,
    floor_id: floorId,
    room_number: String(formData.get("room_number")),
    room_type_id: String(formData.get("room_type_id")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/rooms");
}

export async function updateRoomStatus(roomId: string, status: RoomStatus) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("rooms").update({ status }).eq("id", roomId);
  if (error) throw new Error(error.message);
  revalidatePath("/rooms");
}

export async function createGuest(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("guests").insert({
    full_name: String(formData.get("full_name")),
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    id_proof_type: (formData.get("id_proof_type") as string) || null,
    id_proof_number: (formData.get("id_proof_number") as string) || null,
    address: (formData.get("address") as string) || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/guests");
}

export async function createReservation(formData: FormData) {
  const { supabase, user, propertyId } = await requireUser();

  let guestId = formData.get("guest_id") as string | null;
  if (!guestId) {
    const newName = formData.get("new_guest_name") as string | null;
    if (!newName) throw new Error("Select a guest or enter a new guest name");
    const { data, error } = await supabase
      .from("guests")
      .insert({
        full_name: newName,
        phone: (formData.get("new_guest_phone") as string) || null,
        email: (formData.get("new_guest_email") as string) || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    guestId = data.id;
  }

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

  const { error } = await supabase.from("reservations").insert({
    property_id: propertyId,
    guest_id: guestId,
    room_id: roomId,
    room_type_id: String(formData.get("room_type_id")),
    check_in_date: String(formData.get("check_in_date")),
    check_out_date: String(formData.get("check_out_date")),
    adults: Number(formData.get("adults") ?? 1),
    children: Number(formData.get("children") ?? 0),
    rate_per_night: Number(formData.get("rate_per_night") ?? 0),
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/reservations");
  revalidatePath("/rooms");
  redirect("/reservations");
}

export async function assignRoom(reservationId: string, roomId: string) {
  const { supabase, propertyId } = await requireUser();

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

  const { error } = await supabase.from("reservations").update({ room_id: roomId }).eq("id", reservationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/rooms");
}

export async function checkInReservation(reservationId: string) {
  const { supabase } = await requireUser();

  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("room_id")
    .eq("id", reservationId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (!reservation.room_id) throw new Error("Assign a room to this reservation before checking in.");

  const { error } = await supabase
    .from("reservations")
    .update({ status: "checked_in", actual_check_in_at: new Date().toISOString() })
    .eq("id", reservationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/rooms");
}

export async function checkOutReservation(reservationId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("reservations")
    .update({ status: "checked_out", actual_check_out_at: new Date().toISOString() })
    .eq("id", reservationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/rooms");
}

export async function cancelReservation(reservationId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", reservationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/rooms");
}

export async function addMiscCharge(reservationId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("folio_charges").insert({
    reservation_id: reservationId,
    charge_type: "misc",
    description: String(formData.get("description")),
    amount: Number(formData.get("amount")),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/reservations/${reservationId}`);
}

export async function generateInvoiceForReservation(reservationId: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.rpc("generate_invoice_from_reservation", {
    p_reservation_id: reservationId,
    p_staff_id: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/reservations/${reservationId}`);
  redirect(`/billing/invoices/${data}`);
}
