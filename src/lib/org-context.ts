import { createClient } from "@/lib/supabase/server";

export async function getOrgContext() {
  const supabase = await createClient();

  const [{ data: settings }, { data: userData }] = await Promise.all([
    supabase.from("hotel_settings").select("corporate_name, region_name").limit(1).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  let propertyId: string | null = null;
  let propertyName = "Property";
  let city: string | null = null;
  let gstin: string | null = null;
  let currency = "INR";

  const user = userData?.user;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("property_id, properties(id, name, city, gstin, currency)")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.properties) {
      propertyId = profile.properties.id;
      propertyName = profile.properties.name;
      city = profile.properties.city;
      gstin = profile.properties.gstin;
      currency = profile.properties.currency;
    }
  }

  return {
    corporateName: settings?.corporate_name ?? "Corporate Office",
    regionName: settings?.region_name ?? "Region",
    // Typed non-null: every page that calls this lives under (app)/, whose
    // layout already blocks rendering for any signed-in profile without a
    // property assigned.
    propertyId: propertyId as string,
    // Kept as `hotelName` (rather than renamed) since ~25 pages already
    // destructure it for the breadcrumb trail — it now reflects whichever
    // property the signed-in staff member belongs to.
    hotelName: propertyName,
    city,
    gstin,
    currency,
  };
}
