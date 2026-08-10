"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { cancelReservationWithPolicy, markNoShowWithPolicy } from "@/lib/reservation-ops";
import type { Database } from "@/lib/database.types";

type RoomStatus = Database["public"]["Enums"]["room_status"];
type PaymentMethod = Database["public"]["Enums"]["payment_method"];

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
    preferences: (formData.get("preferences") as string) || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/guests");
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
  const { supabase, user } = await requireUser();
  await cancelReservationWithPolicy(supabase, reservationId, user.id);
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/rooms");
}

export async function markNoShow(reservationId: string) {
  const { supabase, user } = await requireUser();
  await markNoShowWithPolicy(supabase, reservationId, user.id);
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/rooms");
}

// Records a deposit payment ahead of checkout, against the reservation's
// existing invoice if one was already opened (e.g. a prior deposit) or a
// fresh draft one otherwise. generate_invoice_from_reservation (see
// 0033_deposit_invoice_reuse.sql) reuses this same invoice at checkout, so
// the deposit lands as a payment against the final bill instead of being
// stranded on a separate invoice.
export async function collectDeposit(reservationId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method")) as PaymentMethod;
  if (!(amount > 0)) throw new Error("Enter a deposit amount greater than zero.");

  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("guest_id, property_id")
    .eq("id", reservationId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("reservation_id", reservationId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let invoiceId = existingInvoice?.id;
  if (!invoiceId) {
    const { data: newInvoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        guest_id: reservation.guest_id,
        property_id: reservation.property_id,
        reservation_id: reservationId,
        status: "draft",
        issued_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select("id")
      .single();
    if (invoiceError) throw new Error(invoiceError.message);
    invoiceId = newInvoice.id;
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    method,
    reference_number: "Deposit",
    received_by: user.id,
  });
  if (paymentError) throw new Error(paymentError.message);

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath(`/billing/invoices/${invoiceId}`);
}

// Moves a checked-in guest to a room at a different property mid-stay:
// checks the current reservation out (its folio/invoice stay exactly as
// they are — nothing about the stay so far is rewritten) and opens a fresh
// reservation at the destination property, immediately checked in, on the
// same booking (if any) and guest.
export async function transferReservationProperty(reservationId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const destinationPropertyId = String(formData.get("property_id"));
  const roomTypeId = String(formData.get("room_type_id"));
  const roomId = (formData.get("room_id") as string) || null;

  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("guest_id, booking_id, adults, children, rate_per_night, check_out_date, status, property_id")
    .eq("id", reservationId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (reservation.status !== "checked_in") throw new Error("Only a checked-in reservation can be transferred.");
  if (destinationPropertyId === reservation.property_id) throw new Error("Pick a different property to transfer to.");

  if (roomId) {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("status")
      .eq("id", roomId)
      .eq("property_id", destinationPropertyId)
      .maybeSingle();
    if (roomError) throw new Error(roomError.message);
    if (!room || !["available", "dirty"].includes(room.status)) {
      throw new Error("This room is no longer available. Pick a different room.");
    }
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const { error: checkoutError } = await supabase
    .from("reservations")
    .update({ status: "checked_out", actual_check_out_at: now, notes: `Transferred to another property on ${today}` })
    .eq("id", reservationId);
  if (checkoutError) throw new Error(checkoutError.message);

  const { data: newReservation, error: insertError } = await supabase
    .from("reservations")
    .insert({
      property_id: destinationPropertyId,
      booking_id: reservation.booking_id,
      guest_id: reservation.guest_id,
      room_id: roomId,
      room_type_id: roomTypeId,
      check_in_date: today,
      check_out_date: reservation.check_out_date > today ? reservation.check_out_date : tomorrow,
      adults: reservation.adults,
      children: reservation.children,
      rate_per_night: reservation.rate_per_night,
      status: "checked_in",
      actual_check_in_at: now,
      notes: `Continued stay, transferred from another property on ${today}`,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/rooms");
  redirect(`/reservations/${newReservation.id}`);
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
