"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

// Backs both the room-rack drag-and-drop and the plain "change room /
// move dates" form on the reservation page — same server-side validation
// either way (move_reservation() re-checks the target room and the room
// type's date-range availability, excluding this reservation itself).
export async function moveReservation(
  reservationId: string,
  newRoomId: string,
  newCheckIn: string,
  newCheckOut: string,
  newRatePerNight: number | null,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("move_reservation", {
    p_reservation_id: reservationId,
    p_new_room_id: newRoomId,
    p_new_check_in: newCheckIn,
    p_new_check_out: newCheckOut,
    p_new_rate_per_night: newRatePerNight ?? undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/live/room-calendar");
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/rooms");
}
