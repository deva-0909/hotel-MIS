"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function createInvoice(formData: FormData) {
  const { supabase, user } = await requireUser();

  let guestId = formData.get("guest_id") as string | null;
  if (!guestId) {
    const newName = formData.get("new_guest_name") as string | null;
    if (!newName) throw new Error("Select a guest or enter a new guest name");
    const { data, error } = await supabase.from("guests").insert({ full_name: newName, created_by: user.id }).select("id").single();
    if (error) throw new Error(error.message);
    guestId = data.id;
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({ guest_id: guestId, status: "draft", issued_at: new Date().toISOString(), created_by: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/billing/invoices");
  redirect(`/billing/invoices/${invoice.id}`);
}

export async function addInvoiceLineItem(invoiceId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const quantity = Number(formData.get("quantity") ?? 1);
  const unitPrice = Number(formData.get("unit_price"));

  const { error } = await supabase.from("invoice_line_items").insert({
    invoice_id: invoiceId,
    description: String(formData.get("description")),
    source_type: "misc",
    quantity,
    unit_price: unitPrice,
    amount: quantity * unitPrice,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/billing/invoices/${invoiceId}`);
}

export async function updateInvoiceAdjustments(invoiceId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("invoices")
    .update({
      tax_amount: Number(formData.get("tax_amount") ?? 0),
      discount_amount: Number(formData.get("discount_amount") ?? 0),
    })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);

  const { error: recomputeError } = await supabase.rpc("recompute_invoice_totals", { p_invoice_id: invoiceId });
  if (recomputeError) throw new Error(recomputeError.message);
  revalidatePath(`/billing/invoices/${invoiceId}`);
}

export async function recordPayment(invoiceId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount: Number(formData.get("amount")),
    method: String(formData.get("method")) as "cash" | "card" | "upi" | "bank_transfer" | "other",
    reference_number: (formData.get("reference_number") as string) || null,
    received_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/billing/invoices/${invoiceId}`);
  revalidatePath("/billing/invoices");
}

export async function cancelInvoice(invoiceId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", invoiceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/billing/invoices/${invoiceId}`);
  revalidatePath("/billing/invoices");
}
