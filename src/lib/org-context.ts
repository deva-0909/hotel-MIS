import { createClient } from "@/lib/supabase/server";

export async function getOrgContext() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hotel_settings")
    .select("corporate_name, region_name, hotel_name, city, gstin")
    .limit(1)
    .maybeSingle();

  return {
    corporateName: data?.corporate_name ?? "Corporate Office",
    regionName: data?.region_name ?? "Region",
    hotelName: data?.hotel_name ?? "Hotel",
    city: data?.city ?? null,
    gstin: data?.gstin ?? null,
  };
}
