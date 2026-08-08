import { createClient } from "@/lib/supabase/server";
import { ReservationForm } from "./reservation-form";

export default async function NewReservationPage() {
  const supabase = await createClient();
  const [{ data: guests }, { data: roomTypes }, { data: rooms }] = await Promise.all([
    supabase.from("guests").select("id, full_name, phone").order("full_name"),
    supabase.from("room_types").select("id, name, base_rate").order("base_rate"),
    supabase.from("rooms").select("id, room_number, room_type_id, status").order("room_number"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">New reservation</h1>
      <ReservationForm guests={guests ?? []} roomTypes={roomTypes ?? []} rooms={rooms ?? []} />
    </div>
  );
}
