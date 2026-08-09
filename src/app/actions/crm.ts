"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createCampaign(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("crm_campaigns").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
    channel: String(formData.get("channel")),
    audience: String(formData.get("audience")),
    status: String(formData.get("status") || "draft"),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/crm");
}

export async function updateCampaignStatus(campaignId: string, status: "draft" | "scheduled" | "live" | "ended") {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("crm_campaigns").update({ status }).eq("id", campaignId);
  if (error) throw new Error(error.message);
  revalidatePath("/departments/crm");
}

export async function createLead(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("crm_leads").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
    source: (formData.get("source") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/crm");
}

export async function setGuestLoyalty(guestId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("guests")
    .update({
      loyalty_tier: String(formData.get("loyalty_tier")),
      loyalty_points: Number(formData.get("loyalty_points") ?? 0),
    })
    .eq("id", guestId);
  if (error) throw new Error(error.message);
  revalidatePath("/departments/crm");
}
