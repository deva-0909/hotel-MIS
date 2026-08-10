"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { cancelReservationWithPolicy } from "@/lib/reservation-ops";
import type { Database } from "@/lib/database.types";

type BookingSource = Database["public"]["Enums"]["booking_source"];
type BookingType = "individual" | "group" | "corporate" | "travel_agent";

type RoomLine = {
  propertyId: string;
  roomTypeId: string;
  roomId: string | null;
  ratePerNight: number;
  adults: number;
  children: number;
  specialRequests: string | null;
};

// One booking can cover several rooms (group bookings) and, since a room
// line carries its own property, even rooms at different properties —
// each still becomes its own reservations row (unchanged check-in/out/folio
// behavior per room), just grouped under one bookings row for the shared
// guest/source/company/agent/commission.
export async function createBooking(formData: FormData) {
  const { supabase, user } = await requireUser();

  let guestId = formData.get("guest_id") as string | null;
  if (!guestId) {
    const newName = formData.get("new_guest_name") as string | null;
    if (!newName) throw new Error("Select a guest or enter a new guest name");
    const newPhone = (formData.get("new_guest_phone") as string) || null;

    // A phone match against an existing guest reuses that guest instead of
    // creating a duplicate record — the front desk typing a returning
    // guest's details into "new guest" (rather than finding them in the
    // search) no longer fragments their history across two profiles.
    if (newPhone) {
      const { data: existing } = await supabase.from("guests").select("id").eq("phone", newPhone).maybeSingle();
      if (existing) guestId = existing.id;
    }
    if (!guestId) {
      const { data, error } = await supabase
        .from("guests")
        .insert({
          full_name: newName,
          phone: newPhone,
          email: (formData.get("new_guest_email") as string) || null,
          preferences: (formData.get("new_guest_preferences") as string) || null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      guestId = data.id;
    }
  }

  const checkInDate = String(formData.get("check_in_date"));
  const checkOutDate = String(formData.get("check_out_date"));
  const source = String(formData.get("source")) as BookingSource;
  const bookingType = String(formData.get("booking_type")) as BookingType;
  const companyId = (formData.get("company_id") as string) || null;
  const travelAgentId = (formData.get("travel_agent_id") as string) || null;
  const commissionRaw = formData.get("commission_percent") as string;
  const notes = (formData.get("notes") as string) || null;

  let commissionPercent: number | null = commissionRaw ? Number(commissionRaw) : null;
  if (bookingType === "travel_agent" && travelAgentId && commissionPercent === null) {
    const { data: agent } = await supabase
      .from("travel_agents")
      .select("default_commission_percent")
      .eq("id", travelAgentId)
      .maybeSingle();
    commissionPercent = agent?.default_commission_percent ?? 0;
  }

  const rooms = JSON.parse(String(formData.get("rooms_json"))) as RoomLine[];
  if (!rooms.length) throw new Error("Add at least one room");

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      guest_id: guestId,
      source,
      booking_type: bookingType,
      company_id: bookingType === "corporate" ? companyId : null,
      travel_agent_id: bookingType === "travel_agent" ? travelAgentId : null,
      commission_percent: bookingType === "travel_agent" ? commissionPercent : null,
      notes,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (bookingError) throw new Error(bookingError.message);

  for (const room of rooms) {
    // Real per-date capacity + restriction check (see 0034_rate_plans_and_availability.sql)
    // — catches over-selling a room type even when no specific room is
    // picked, and honors min/max-stay, stop-sell, and CTA/CTD, none of
    // which a room's current status flag can tell you for a future date.
    const { data: hasAvailability, error: availabilityError } = await supabase.rpc("check_availability", {
      p_room_type_id: room.roomTypeId,
      p_check_in: checkInDate,
      p_check_out: checkOutDate,
    });
    if (availabilityError) throw new Error(availabilityError.message);
    if (!hasAvailability) {
      throw new Error("No availability for one of the selected room types on these dates.");
    }

    if (room.roomId) {
      const { data: roomRow, error: roomError } = await supabase
        .from("rooms")
        .select("status")
        .eq("id", room.roomId)
        .eq("property_id", room.propertyId)
        .maybeSingle();
      if (roomError) throw new Error(roomError.message);
      if (!roomRow || !["available", "dirty"].includes(roomRow.status)) {
        throw new Error("One of the selected rooms is no longer available. Pick a different room.");
      }

      const { data: conflicting, error: conflictError } = await supabase
        .from("reservations")
        .select("id")
        .eq("room_id", room.roomId)
        .in("status", ["confirmed", "checked_in"])
        .lt("check_in_date", checkOutDate)
        .gt("check_out_date", checkInDate)
        .limit(1);
      if (conflictError) throw new Error(conflictError.message);
      if (conflicting?.length) {
        throw new Error("One of the selected rooms is already booked for an overlapping date. Pick a different room.");
      }
    }

    const { error } = await supabase.from("reservations").insert({
      property_id: room.propertyId,
      booking_id: booking.id,
      guest_id: guestId,
      room_id: room.roomId,
      room_type_id: room.roomTypeId,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      adults: room.adults,
      children: room.children,
      rate_per_night: room.ratePerNight,
      special_requests: room.specialRequests,
      created_by: user.id,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/reservations");
  revalidatePath("/rooms");
  redirect(`/bookings/${booking.id}`);
}

// Cancels every still-cancellable reservation under a group/multi-room
// booking in one action, applying the same per-reservation cancellation
// policy as cancelling a single reservation.
export async function cancelBooking(bookingId: string) {
  const { supabase, user } = await requireUser();
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id")
    .eq("booking_id", bookingId)
    .in("status", ["confirmed", "checked_in"]);
  if (error) throw new Error(error.message);

  for (const r of reservations ?? []) {
    await cancelReservationWithPolicy(supabase, r.id, user.id);
  }

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/reservations");
  revalidatePath("/rooms");
}
