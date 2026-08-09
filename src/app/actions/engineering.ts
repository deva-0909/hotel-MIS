"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createAsset(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("engineering_assets").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
    category: String(formData.get("category")),
    location: (formData.get("location") as string) || null,
    next_service_date: (formData.get("next_service_date") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/live/asset-registry");
  revalidatePath("/departments/engineering");
}

export async function updateAssetStatus(assetId: string, status: "operational" | "under_maintenance" | "needs_attention") {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("engineering_assets").update({ status }).eq("id", assetId);
  if (error) throw new Error(error.message);
  revalidatePath("/live/asset-registry");
  revalidatePath("/departments/engineering");
}

export async function createWorkOrder(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("work_orders").insert({
    property_id: propertyId,
    location: String(formData.get("location")),
    issue: String(formData.get("issue")),
    priority: String(formData.get("priority") || "medium"),
    asset_id: (formData.get("asset_id") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/engineering");
}

export async function updateWorkOrder(
  workOrderId: string,
  formData: { status?: string; assigned_to?: string },
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("work_orders").update(formData).eq("id", workOrderId);
  if (error) throw new Error(error.message);
  revalidatePath("/departments/engineering");
}
