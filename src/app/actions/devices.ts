"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createDevice(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const deviceType = String(formData.get("device_type")) as "printer" | "kds";
  const restaurantId = (formData.get("restaurant_id") as string) || null;
  const serviceAreaId = (formData.get("service_area_id") as string) || null;
  const kitchenId = (formData.get("kitchen_id") as string) || null;

  const { error } = await supabase.from("devices").insert({
    property_id: propertyId,
    device_type: deviceType,
    name: String(formData.get("name")),
    identifier: (formData.get("identifier") as string) || null,
    restaurant_id: deviceType === "printer" ? restaurantId : null,
    service_area_id: deviceType === "printer" ? serviceAreaId : null,
    kitchen_id: deviceType === "kds" ? kitchenId : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/devices");
}

export async function toggleDeviceActive(deviceId: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("devices").update({ is_active: isActive }).eq("id", deviceId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/devices");
}

export async function deleteDevice(deviceId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("devices").delete().eq("id", deviceId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/devices");
}
