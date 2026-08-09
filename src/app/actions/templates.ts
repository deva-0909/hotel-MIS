"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

// ---------- Corporate admin: manage the templates themselves ----------

export async function createRoomTypeTemplate(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("corporate_room_type_templates").insert({
    name: String(formData.get("name")),
    base_rate: Number(formData.get("base_rate") ?? 0),
    max_occupancy: Number(formData.get("max_occupancy") ?? 2),
    description: (formData.get("description") as string) || null,
    amenities: (formData.get("amenities") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/templates");
}

export async function createMenuCategoryTemplate(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("corporate_menu_category_templates").insert({
    name: String(formData.get("name")),
    sort_order: Number(formData.get("sort_order") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/templates");
}

export async function createBanquetPackageTemplate(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("corporate_banquet_package_templates").insert({
    name: String(formData.get("name")),
    description: (formData.get("description") as string) || null,
    price_per_cover: Number(formData.get("price_per_cover") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/templates");
}

// ---------- Property side: adopt a template into a property-scoped row ----------
// Adopting copies the template's current values in as a normal editable row
// (tagged with template_id for lineage) — it's a one-time starting point,
// not a live link, so the property can freely diverge afterwards.

export async function adoptRoomTypeTemplate(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const templateId = String(formData.get("template_id"));

  const { data: template, error: templateError } = await supabase
    .from("corporate_room_type_templates")
    .select("name, base_rate, max_occupancy, description, amenities")
    .eq("id", templateId)
    .single();
  if (templateError) throw new Error(templateError.message);

  const { error } = await supabase.from("room_types").insert({
    property_id: propertyId,
    template_id: templateId,
    name: template.name,
    base_rate: template.base_rate,
    max_occupancy: template.max_occupancy,
    description: template.description,
    amenities: template.amenities,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/rooms");
}

export async function adoptMenuCategoryTemplate(formData: FormData) {
  const { supabase } = await requireUser();
  const templateId = String(formData.get("template_id"));
  const restaurantId = String(formData.get("restaurant_id"));

  const { data: template, error: templateError } = await supabase
    .from("corporate_menu_category_templates")
    .select("name, sort_order")
    .eq("id", templateId)
    .single();
  if (templateError) throw new Error(templateError.message);

  const { error } = await supabase.from("menu_categories").insert({
    restaurant_id: restaurantId,
    template_id: templateId,
    name: template.name,
    sort_order: template.sort_order,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function adoptBanquetPackageTemplate(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const templateId = String(formData.get("template_id"));

  const { data: template, error: templateError } = await supabase
    .from("corporate_banquet_package_templates")
    .select("name, description, price_per_cover")
    .eq("id", templateId)
    .single();
  if (templateError) throw new Error(templateError.message);

  const { error } = await supabase.from("banquet_menu_packages").insert({
    property_id: propertyId,
    template_id: templateId,
    name: template.name,
    description: template.description,
    price_per_cover: template.price_per_cover,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments/banquet");
}
