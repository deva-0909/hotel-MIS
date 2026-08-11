"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function addOccupant(reservationId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reservation_occupants").insert({
    reservation_id: reservationId,
    full_name: String(formData.get("full_name")),
    age_category: String(formData.get("age_category") || "adult"),
    id_proof_type: (formData.get("id_proof_type") as string) || null,
    id_proof_number: (formData.get("id_proof_number") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/reservations/${reservationId}`);
}

export async function removeOccupant(occupantId: string, reservationId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reservation_occupants").delete().eq("id", occupantId);
  if (error) throw new Error(error.message);
  revalidatePath(`/reservations/${reservationId}`);
}
