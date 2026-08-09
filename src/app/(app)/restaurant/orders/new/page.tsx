import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { OrderForm } from "./order-form";

export default async function NewOrderPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: restaurants } = await supabase.from("restaurants").select("id").eq("property_id", org.propertyId);
  const restaurantIds = (restaurants ?? []).map((r) => r.id);

  const [{ data: tables }, { data: reservations }] = await Promise.all([
    restaurantIds.length
      ? supabase.from("restaurant_tables").select("id, table_number").in("restaurant_id", restaurantIds).order("table_number")
      : Promise.resolve({ data: [] }),
    supabase
      .from("reservations")
      .select("id, reservation_number, guests(full_name), rooms(room_number)")
      .eq("property_id", org.propertyId)
      .eq("status", "checked_in")
      .order("check_in_date"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">New order</h1>
      <OrderForm tables={tables ?? []} reservations={reservations ?? []} />
    </div>
  );
}
