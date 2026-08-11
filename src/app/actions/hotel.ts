"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { cancelReservationWithPolicy, markNoShowWithPolicy } from "@/lib/reservation-ops";
import { parseBookingPolicy } from "@/lib/booking-policy";
import { getPropertyToday, getPropertyCurrentTime } from "@/lib/format-datetime";
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
    nationality: (formData.get("nationality") as string) || null,
    passport_number: (formData.get("passport_number") as string) || null,
    passport_country: (formData.get("passport_country") as string) || null,
    passport_expiry: (formData.get("passport_expiry") as string) || null,
    visa_number: (formData.get("visa_number") as string) || null,
    visa_expiry: (formData.get("visa_expiry") as string) || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/guests");
}

// Early/late is detected against the property's own configured standard
// check-in/out time (Organization → Properties → booking policy), not a
// hardcoded 2pm/11am — compared in the property's own timezone so a
// midnight-UTC property doesn't get miscategorized.
export async function checkInReservation(reservationId: string, formData?: FormData) {
  const { supabase, user } = await requireUser();

  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("room_id, check_in_date, properties(timezone, booking_policy)")
    .eq("id", reservationId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (!reservation.room_id) throw new Error("Assign a room to this reservation before checking in.");

  const timezone = reservation.properties?.timezone ?? "Asia/Kolkata";
  const policy = parseBookingPolicy(reservation.properties?.booking_policy);
  const today = getPropertyToday(timezone);
  const nowTime = getPropertyCurrentTime(timezone);
  const isEarly = today < reservation.check_in_date || (today === reservation.check_in_date && nowTime < policy.standard_check_in_time);

  let signaturePath: string | null = null;
  const signatureFile = formData?.get("signature") as File | null;
  if (signatureFile && signatureFile.size > 0) {
    const path = `${reservationId}/signature-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from("guest-signatures").upload(path, signatureFile);
    if (uploadError) throw new Error(uploadError.message);
    signaturePath = path;
  }

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "checked_in",
      actual_check_in_at: new Date().toISOString(),
      early_checkin: isEarly,
      ...(signaturePath ? { signature_path: signaturePath } : {}),
    })
    .eq("id", reservationId);
  if (error) throw new Error(error.message);

  const fee = Number(formData?.get("fee") ?? 0);
  if (isEarly && fee > 0) {
    const { error: chargeError } = await supabase.from("folio_charges").insert({
      reservation_id: reservationId,
      charge_type: "fee",
      description: "Early check-in fee",
      amount: fee,
      created_by: user.id,
    });
    if (chargeError) throw new Error(chargeError.message);
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/rooms");
}

export async function checkOutReservation(reservationId: string, formData?: FormData) {
  const { supabase, user } = await requireUser();

  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("check_out_date, properties(timezone, booking_policy)")
    .eq("id", reservationId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const timezone = reservation.properties?.timezone ?? "Asia/Kolkata";
  const policy = parseBookingPolicy(reservation.properties?.booking_policy);
  const today = getPropertyToday(timezone);
  const nowTime = getPropertyCurrentTime(timezone);
  const isLate = today > reservation.check_out_date || (today === reservation.check_out_date && nowTime > policy.standard_check_out_time);

  const { error } = await supabase
    .from("reservations")
    .update({ status: "checked_out", actual_check_out_at: new Date().toISOString(), late_checkout: isLate })
    .eq("id", reservationId);
  if (error) throw new Error(error.message);

  const fee = Number(formData?.get("fee") ?? 0);
  if (isLate && fee > 0) {
    const { error: chargeError } = await supabase.from("folio_charges").insert({
      reservation_id: reservationId,
      charge_type: "fee",
      description: "Late checkout fee",
      amount: fee,
      created_by: user.id,
    });
    if (chargeError) throw new Error(chargeError.message);
  }

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

// Moves a folio charge from one room's bill to another — e.g. a group
// booking where a minibar charge got posted against the wrong room, or
// staff decide to consolidate one guest's incidentals onto another room in
// the same stay. Only unbilled charges move: one already on an invoice
// needs the invoice split/merged instead (billing.ts), since an invoice
// line item is a separate row from the folio_charges row it was built from.
export async function transferFolioCharge(chargeId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const targetReservationId = String(formData.get("target_reservation_id"));
  if (!targetReservationId) throw new Error("Select a reservation to transfer this charge to");

  const { data: charge, error: chargeError } = await supabase
    .from("folio_charges")
    .select("reservation_id")
    .eq("id", chargeId)
    .single();
  if (chargeError) throw new Error(chargeError.message);

  const { data: alreadyInvoiced } = await supabase
    .from("invoice_line_items")
    .select("id")
    .eq("source_table", "folio_charges")
    .eq("source_id", chargeId)
    .maybeSingle();
  if (alreadyInvoiced) throw new Error("This charge is already on an invoice — split or merge the invoice instead of transferring the charge.");

  const { error } = await supabase.from("folio_charges").update({ reservation_id: targetReservationId }).eq("id", chargeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/reservations/${charge.reservation_id}`);
  revalidatePath(`/reservations/${targetReservationId}`);
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
