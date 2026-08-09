"use server";

import { requireUser } from "@/lib/require-user";

// Wizard-only variants: unlike the existing per-page create actions, every
// insert here targets an explicit propertyId chosen mid-wizard rather than
// the caller's own assigned property (RLS's is_staff_for_property already
// lets an admin write to any property), and every action returns the
// inserted row instead of redirecting/revalidating a fixed page — the
// wizard is a single client component driving its own step state, and a
// redirect thrown mid-step would break that flow the same way it would
// have in the journal-entry form.

export async function wizardCreateProperty(formData: FormData) {
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
    })
    .select("id, name, code, currency")
    .single();
  if (error) throw new Error(error.message);

  const { error: seedError } = await supabase.rpc("seed_default_chart_of_accounts", { p_property_id: data.id });
  if (seedError) throw new Error(seedError.message);

  return data;
}

export async function wizardCreateBuilding(propertyId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("buildings")
    .insert({ property_id: propertyId, name: String(formData.get("name")) })
    .select("id, name")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function wizardCreateFloor(buildingId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("floors")
    .insert({
      building_id: buildingId,
      name: String(formData.get("name")),
      sort_order: Number(formData.get("sort_order") ?? 0),
    })
    .select("id, name")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function wizardCreateRoomType(propertyId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("room_types")
    .insert({
      property_id: propertyId,
      name: String(formData.get("name")),
      base_rate: Number(formData.get("base_rate") ?? 0),
      max_occupancy: Number(formData.get("max_occupancy") ?? 2),
      amenities: (formData.get("amenities") as string) || null,
    })
    .select("id, name, base_rate")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function wizardCreateRoom(propertyId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const floorId = String(formData.get("floor_id"));
  const { data: floor, error: floorError } = await supabase.from("floors").select("building_id").eq("id", floorId).single();
  if (floorError) throw new Error(floorError.message);

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      property_id: propertyId,
      building_id: floor.building_id,
      floor_id: floorId,
      room_number: String(formData.get("room_number")),
      room_type_id: String(formData.get("room_type_id")),
    })
    .select("id, room_number")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function wizardCreateRestaurant(propertyId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      property_id: propertyId,
      name: String(formData.get("name")),
      description: (formData.get("description") as string) || null,
    })
    .select("id, name")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
