"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DAYS } from "@/lib/working-hours";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function createProperty(formData: FormData) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      name: String(formData.get("name")),
      code: String(formData.get("code")).toUpperCase(),
      city: (formData.get("city") as string) || null,
      address: (formData.get("address") as string) || null,
      gstin: (formData.get("gstin") as string) || null,
      currency: (formData.get("currency") as string) || "INR",
      timezone: (formData.get("timezone") as string) || "Asia/Kolkata",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: seedError } = await supabase.rpc("seed_default_chart_of_accounts", { p_property_id: data.id });
  if (seedError) throw new Error(seedError.message);

  revalidatePath("/organization/properties");
  redirect(`/organization/properties/${data.id}`);
}

export async function togglePropertyActive(propertyId: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("properties").update({ is_active: isActive }).eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/properties");
}

export async function updatePropertySettings(propertyId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("properties")
    .update({
      currency: String(formData.get("currency")),
      timezone: String(formData.get("timezone")),
    })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath(`/organization/properties/${propertyId}`);
}

export async function updateWorkingHours(propertyId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const workingHours = Object.fromEntries(
    DAYS.map((day) => [
      day,
      {
        open: String(formData.get(`${day}_open`) || "00:00"),
        close: String(formData.get(`${day}_close`) || "23:59"),
        closed: formData.get(`${day}_closed`) === "on",
      },
    ]),
  );
  const { error } = await supabase.from("properties").update({ working_hours: workingHours }).eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath(`/organization/properties/${propertyId}`);
}

export async function createBuilding(propertyId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("buildings").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/organization/properties/${propertyId}`);
}

export async function createFloor(buildingId: string, propertyId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("floors").insert({
    building_id: buildingId,
    name: String(formData.get("name")),
    sort_order: Number(formData.get("sort_order") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/organization/properties/${propertyId}`);
}

export async function createRestaurant(propertyId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("restaurants").insert({
    property_id: propertyId,
    name: String(formData.get("name")),
    description: (formData.get("description") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/organization/properties/${propertyId}`);
}

export async function toggleRestaurantActive(restaurantId: string, propertyId: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("restaurants").update({ is_active: isActive }).eq("id", restaurantId);
  if (error) throw new Error(error.message);
  revalidatePath(`/organization/properties/${propertyId}`);
}
