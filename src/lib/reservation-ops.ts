import type { createClient } from "@/lib/supabase/server";
import { parseBookingPolicy, isWithinFreeCancellationWindow, computeCancellationFee, computeNoShowFee } from "@/lib/booking-policy";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Shared by the single-reservation cancel action and the bulk
// cancel-whole-booking action so the cancellation-fee policy is applied
// identically either way: charges a fee (as a folio charge, immediately
// invoiced) when cancelling inside the property's free-cancellation
// window, then marks the reservation cancelled.
export async function cancelReservationWithPolicy(supabase: Supabase, reservationId: string, userId: string) {
  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("property_id, check_in_date, rate_per_night, status")
    .eq("id", reservationId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (reservation.status === "cancelled" || reservation.status === "checked_out" || reservation.status === "no_show") {
    return;
  }

  const { data: property } = await supabase.from("properties").select("booking_policy").eq("id", reservation.property_id).single();
  const policy = parseBookingPolicy(property?.booking_policy);

  let feeCharged = false;
  if (policy.cancellation_fee_percent > 0 && !isWithinFreeCancellationWindow(reservation.check_in_date, policy)) {
    const fee = computeCancellationFee(policy, reservation.rate_per_night);
    if (fee > 0) {
      const { error: chargeError } = await supabase.from("folio_charges").insert({
        reservation_id: reservationId,
        charge_type: "fee",
        description: `Cancellation fee (${policy.cancellation_fee_percent}% of one night — inside the ${policy.cancellation_free_hours}h free-cancellation window)`,
        amount: fee,
        created_by: userId,
      });
      if (chargeError) throw new Error(chargeError.message);
      feeCharged = true;
    }
  }

  const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", reservationId);
  if (error) throw new Error(error.message);

  if (feeCharged) {
    await supabase.rpc("generate_invoice_from_reservation", { p_reservation_id: reservationId, p_staff_id: userId });
  }
}

export async function markNoShowWithPolicy(supabase: Supabase, reservationId: string, userId: string) {
  const { data: reservation, error: fetchError } = await supabase
    .from("reservations")
    .select("property_id, rate_per_night, status")
    .eq("id", reservationId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (reservation.status !== "confirmed") {
    throw new Error("Only a confirmed reservation that never checked in can be marked no-show.");
  }

  const { data: property } = await supabase.from("properties").select("booking_policy").eq("id", reservation.property_id).single();
  const policy = parseBookingPolicy(property?.booking_policy);
  const fee = computeNoShowFee(policy, reservation.rate_per_night);

  const { error } = await supabase.from("reservations").update({ status: "no_show" }).eq("id", reservationId);
  if (error) throw new Error(error.message);

  if (fee > 0) {
    const { error: chargeError } = await supabase.from("folio_charges").insert({
      reservation_id: reservationId,
      charge_type: "fee",
      description: `No-show fee (${policy.no_show_fee_percent}% of one night)`,
      amount: fee,
      created_by: userId,
    });
    if (chargeError) throw new Error(chargeError.message);
    await supabase.rpc("generate_invoice_from_reservation", { p_reservation_id: reservationId, p_staff_id: userId });
  }
}
