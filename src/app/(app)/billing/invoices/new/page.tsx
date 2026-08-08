import { createClient } from "@/lib/supabase/server";
import { InvoiceGuestForm } from "./invoice-guest-form";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const { data: guests } = await supabase.from("guests").select("id, full_name, phone").order("full_name");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">New invoice</h1>
      <InvoiceGuestForm guests={guests ?? []} />
    </div>
  );
}
