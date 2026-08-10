"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createRatePlan(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("rate_plans").insert({
    property_id: propertyId,
    room_type_id: String(formData.get("room_type_id")),
    name: String(formData.get("name")),
    base_rate: Number(formData.get("base_rate") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/rate-plans");
}

export async function toggleRatePlanActive(ratePlanId: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("rate_plans").update({ is_active: isActive }).eq("id", ratePlanId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/rate-plans");
}
