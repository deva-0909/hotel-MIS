import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "./order-form";

export default async function NewOrderPage() {
  const supabase = await createClient();
  const [{ data: tables }, { data: reservations }] = await Promise.all([
    supabase.from("restaurant_tables").select("id, table_number").order("table_number"),
    supabase
      .from("reservations")
      .select("id, reservation_number, guests(full_name), rooms(room_number)")
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
