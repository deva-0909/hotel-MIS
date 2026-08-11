"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";

export async function createInvoice(formData: FormData) {
  const { supabase, user, propertyId } = await requireUser();

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
    .insert({ guest_id: guestId, property_id: propertyId, status: "draft", issued_at: new Date().toISOString(), created_by: user.id })
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

// tax_amount is no longer set here — recompute_invoice_totals derives it
// from the invoice's line items against configured tax_rates (see
// 0021_tax_rates.sql) and would just overwrite a manually-typed value on
// the next line-item change anyway.
export async function updateInvoiceAdjustments(invoiceId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("invoices")
    .update({ discount_amount: Number(formData.get("discount_amount") ?? 0) })
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

// The refunds table's own trigger (validate_refund_amount) rejects
// refunding more than that payment's remaining balance, and
// recompute_invoice_totals nets refunds out of amount_paid automatically —
// this just needs to insert the row.
export async function recordRefund(invoiceId: string, paymentId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("refunds").insert({
    payment_id: paymentId,
    amount: Number(formData.get("amount")),
    reason: (formData.get("reason") as string) || null,
    refunded_by: user.id,
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

// Splits selected line items off into a brand-new invoice for the same
// guest/reservation/booking — e.g. the company pays for the room, the
// guest pays incidentals out of pocket, split into two separate bills.
export async function splitInvoiceLineItems(invoiceId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const lineItemIds = formData.getAll("line_item_ids") as string[];
  if (!lineItemIds.length) throw new Error("Select at least one line item to split off");

  const { data: source, error: sourceError } = await supabase
    .from("invoices")
    .select("guest_id, reservation_id, booking_id, property_id, bill_to, company_id, travel_agent_id")
    .eq("id", invoiceId)
    .single();
  if (sourceError) throw new Error(sourceError.message);

  const { data: newInvoice, error: createError } = await supabase
    .from("invoices")
    .insert({
      guest_id: source.guest_id,
      reservation_id: source.reservation_id,
      booking_id: source.booking_id,
      property_id: source.property_id,
      bill_to: source.bill_to,
      company_id: source.company_id,
      travel_agent_id: source.travel_agent_id,
      status: "draft",
      issued_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (createError) throw new Error(createError.message);

  const { error: moveError } = await supabase
    .from("invoice_line_items")
    .update({ invoice_id: newInvoice.id })
    .in("id", lineItemIds)
    .eq("invoice_id", invoiceId);
  if (moveError) throw new Error(moveError.message);

  await supabase.rpc("recompute_invoice_totals", { p_invoice_id: invoiceId });
  await supabase.rpc("recompute_invoice_totals", { p_invoice_id: newInvoice.id });

  revalidatePath(`/billing/invoices/${invoiceId}`);
  revalidatePath("/billing/invoices");
  redirect(`/billing/invoices/${newInvoice.id}`);
}

// Folds a source invoice's line items and payments into a target invoice,
// then cancels the (now-empty) source — the reverse of a split, for when
// two bills should have been one all along.
export async function mergeInvoiceInto(targetInvoiceId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const sourceInvoiceId = String(formData.get("source_invoice_id"));
  if (!sourceInvoiceId) throw new Error("Select an invoice to merge in");
  if (targetInvoiceId === sourceInvoiceId) throw new Error("Cannot merge an invoice into itself");

  const { error: moveItemsError } = await supabase
    .from("invoice_line_items")
    .update({ invoice_id: targetInvoiceId })
    .eq("invoice_id", sourceInvoiceId);
  if (moveItemsError) throw new Error(moveItemsError.message);

  const { error: movePaymentsError } = await supabase.from("payments").update({ invoice_id: targetInvoiceId }).eq("invoice_id", sourceInvoiceId);
  if (movePaymentsError) throw new Error(movePaymentsError.message);

  await supabase.rpc("recompute_invoice_totals", { p_invoice_id: targetInvoiceId });

  const { error: cancelError } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", sourceInvoiceId);
  if (cancelError) throw new Error(cancelError.message);
  await supabase.rpc("recompute_invoice_totals", { p_invoice_id: sourceInvoiceId });

  revalidatePath(`/billing/invoices/${targetInvoiceId}`);
  revalidatePath(`/billing/invoices/${sourceInvoiceId}`);
  revalidatePath("/billing/invoices");
}

export async function updateInvoiceBillTo(invoiceId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const billTo = String(formData.get("bill_to") || "guest");
  const { error } = await supabase
    .from("invoices")
    .update({
      bill_to: billTo,
      company_id: billTo === "company" ? (formData.get("company_id") as string) || null : null,
      travel_agent_id: billTo === "travel_agent" ? (formData.get("travel_agent_id") as string) || null : null,
    })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/billing/invoices/${invoiceId}`);
}

export async function generateMasterInvoice(bookingId: string) {
  const { supabase, user } = await requireUser();
  const { data: invoiceId, error } = await supabase.rpc("generate_master_invoice_from_booking", {
    p_booking_id: bookingId,
    p_staff_id: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/billing/invoices/${invoiceId}`);
}
