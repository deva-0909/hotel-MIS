"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createTaxRate(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("tax_rates").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
    rate_percent: Number(formData.get("rate_percent") ?? 0),
    applies_to: String(formData.get("applies_to")) as "room" | "restaurant" | "service" | "misc" | "all",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/accounts/tax-rates");
}

export async function toggleTaxRateActive(taxRateId: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("tax_rates").update({ is_active: isActive }).eq("id", taxRateId);
  if (error) throw new Error(error.message);
  revalidatePath("/accounts/tax-rates");
}
