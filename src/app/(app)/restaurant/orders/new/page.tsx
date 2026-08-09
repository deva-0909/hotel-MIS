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
    // Not property-scoped: a guest visiting from a sister property can still
    // be billed here (see 0020_cross_property_dining) — the form groups
    // these by property so staff can tell home-property guests apart from
    // visitors.
    supabase
      .from("reservations")
      .select("id, reservation_number, property_id, properties(name), guests(full_name), rooms(room_number)")
      .eq("status", "checked_in")
      .order("check_in_date"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">New order</h1>
      <OrderForm tables={tables ?? []} reservations={reservations ?? []} homePropertyId={org.propertyId} />
    </div>
  );
}
