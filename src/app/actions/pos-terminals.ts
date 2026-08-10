"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createPosTerminal(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("pos_terminals").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
    identifier: (formData.get("identifier") as string) || null,
    restaurant_id: (formData.get("restaurant_id") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/pos-terminals");
}

export async function togglePosTerminalActive(terminalId: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("pos_terminals").update({ is_active: isActive }).eq("id", terminalId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/pos-terminals");
}

export async function deletePosTerminal(terminalId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("pos_terminals").delete().eq("id", terminalId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/pos-terminals");
}
