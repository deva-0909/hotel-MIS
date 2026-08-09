"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function createAccount(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.from("chart_of_accounts").insert({
    property_id: propertyId,
    code: String(formData.get("code")).toUpperCase(),
    name: String(formData.get("name")),
    account_type: String(formData.get("account_type")) as "asset" | "liability" | "equity" | "revenue" | "expense",
    parent_id: (formData.get("parent_id") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/accounts/chart-of-accounts");
}

export async function toggleAccountActive(accountId: string, isActive: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("chart_of_accounts").update({ is_active: isActive }).eq("id", accountId);
  if (error) throw new Error(error.message);
  revalidatePath("/accounts/chart-of-accounts");
}

export async function seedChartOfAccounts() {
  const { supabase, propertyId } = await requireUser();
  const { error } = await supabase.rpc("seed_default_chart_of_accounts", { p_property_id: propertyId });
  if (error) throw new Error(error.message);
  revalidatePath("/accounts/chart-of-accounts");
}

type JournalLineInput = { account_id: string; debit: number; credit: number };

// Returns the new entry's id instead of redirecting here — this is called
// directly from a client component (JournalEntryForm) that needs to run its
// own balance validation and error handling around the call, and mixing
// redirect() into that would risk the client's catch block swallowing the
// framework's redirect signal.
export async function createJournalEntry(formData: FormData): Promise<{ id: string }> {
  const { supabase, user, propertyId } = await requireUser();
  let lines: JournalLineInput[];
  try {
    lines = JSON.parse(String(formData.get("lines") || "[]"));
  } catch {
    throw new Error("Invalid line items");
  }

  const { data, error } = await supabase.rpc("create_journal_entry", {
    p_property_id: propertyId,
    p_entry_date: String(formData.get("entry_date")),
    p_description: String(formData.get("description")),
    p_lines: lines,
    p_staff_id: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/accounts/journal-entries");
  revalidatePath("/accounts/trial-balance");
  revalidatePath("/accounts/profit-loss");
  return { id: data as string };
}

export async function postInvoiceToLedger(invoiceId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.rpc("post_invoice_to_ledger", { p_invoice_id: invoiceId, p_staff_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath(`/billing/invoices/${invoiceId}`);
  revalidatePath("/accounts/journal-entries");
  revalidatePath("/accounts/trial-balance");
  revalidatePath("/accounts/profit-loss");
}

export async function postPaymentToLedger(paymentId: string, invoiceId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.rpc("post_payment_to_ledger", { p_payment_id: paymentId, p_staff_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath(`/billing/invoices/${invoiceId}`);
  revalidatePath("/accounts/journal-entries");
  revalidatePath("/accounts/trial-balance");
  revalidatePath("/accounts/profit-loss");
}
