import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { BookingForm } from "./reservation-form";

export default async function NewReservationPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: guests }, { data: allReservations }, { data: properties }, { data: roomTypes }, { data: rooms }, { data: companies }, { data: agents }] =
    await Promise.all([
      supabase.from("guests").select("id, full_name, phone").order("full_name"),
      supabase.from("reservations").select("guest_id").limit(5000),
      supabase.from("properties").select("id, name").eq("is_active", true).order("name"),
      supabase.from("room_types").select("id, name, base_rate, property_id").order("base_rate"),
      supabase.from("rooms").select("id, room_number, room_type_id, property_id, status").order("room_number"),
      supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
      supabase.from("travel_agents").select("id, name, default_commission_percent").eq("is_active", true).order("name"),
    ]);

  const stayCountByGuest = new Map<string, number>();
  for (const r of allReservations ?? []) {
    stayCountByGuest.set(r.guest_id, (stayCountByGuest.get(r.guest_id) ?? 0) + 1);
  }
  const guestsWithStays = (guests ?? []).map((g) => ({ ...g, stayCount: stayCountByGuest.get(g.id) ?? 0 }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">New booking</h1>
      <BookingForm
        guests={guestsWithStays}
        properties={properties ?? []}
        roomTypes={roomTypes ?? []}
        rooms={rooms ?? []}
        companies={companies ?? []}
        agents={agents ?? []}
        defaultPropertyId={org.propertyId}
        currency={org.currency}
      />
    </div>
  );
}
