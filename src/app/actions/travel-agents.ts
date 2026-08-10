"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createTravelAgent(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("travel_agents").insert({
    name: String(formData.get("name")),
    contact_email: (formData.get("contact_email") as string) || null,
    contact_phone: (formData.get("contact_phone") as string) || null,
    default_commission_percent: Number(formData.get("default_commission_percent") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/travel-agents");
}

export async function toggleTravelAgentActive(agentId: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("travel_agents").update({ is_active: isActive }).eq("id", agentId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/travel-agents");
}
