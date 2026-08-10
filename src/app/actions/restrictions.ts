"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createRestriction(formData: FormData) {
  const { supabase, user, propertyId } = await requireUser();
  const minStay = formData.get("min_stay") as string;
  const maxStay = formData.get("max_stay") as string;

  const { error } = await supabase.from("availability_restrictions").insert({
    property_id: propertyId,
    room_type_id: String(formData.get("room_type_id")),
    start_date: String(formData.get("start_date")),
    end_date: String(formData.get("end_date")),
    min_stay: minStay ? Number(minStay) : null,
    max_stay: maxStay ? Number(maxStay) : null,
    closed_to_arrival: formData.get("closed_to_arrival") === "on",
    closed_to_departure: formData.get("closed_to_departure") === "on",
    stop_sell: formData.get("stop_sell") === "on",
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/restrictions");
}

export async function deleteRestriction(restrictionId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("availability_restrictions").delete().eq("id", restrictionId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/restrictions");
}
