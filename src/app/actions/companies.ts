"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createCompany(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("companies").insert({
    name: String(formData.get("name")),
    gstin: (formData.get("gstin") as string) || null,
    billing_address: (formData.get("billing_address") as string) || null,
    contact_email: (formData.get("contact_email") as string) || null,
    contact_phone: (formData.get("contact_phone") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/companies");
}

export async function toggleCompanyActive(companyId: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("companies").update({ is_active: isActive }).eq("id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/companies");
}
