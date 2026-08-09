"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createKitchen(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("kitchens").insert({
    name: String(formData.get("name")),
    is_central: formData.get("is_central") === "on",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/kitchens");
}

export async function linkKitchenProperty(kitchenId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const propertyId = String(formData.get("property_id"));
  const { error } = await supabase.from("kitchen_properties").insert({ kitchen_id: kitchenId, property_id: propertyId });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/kitchens");
}

export async function unlinkKitchenProperty(kitchenId: string, propertyId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("kitchen_properties")
    .delete()
    .eq("kitchen_id", kitchenId)
    .eq("property_id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/kitchens");
}

export async function createServiceArea(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("service_areas").insert({
    restaurant_id: String(formData.get("restaurant_id")),
    name: String(formData.get("name")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/tables");
}
