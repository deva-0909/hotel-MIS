"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createStore(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("stores").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/stores");
}

export async function toggleStoreActive(storeId: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("stores").update({ is_active: isActive }).eq("id", storeId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/stores");
}
