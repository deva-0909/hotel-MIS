"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";

// Direction is relative to this property: "send" means we're the source
// (from_property_id = us), "request" means we're asking another property to
// ship to us (to_property_id = us). Either way the counterparty is picked
// from the form, not assumed.
export async function createTransfer(formData: FormData) {
  const { supabase, user, propertyId } = await requireUser();
  const direction = String(formData.get("direction"));
  const counterpartyId = String(formData.get("counterparty_property_id"));

  const { data, error } = await supabase
    .from("stock_transfers")
    .insert({
      from_property_id: direction === "send" ? propertyId : counterpartyId,
      to_property_id: direction === "send" ? counterpartyId : propertyId,
      notes: (formData.get("notes") as string) || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/inventory/transfers");
  redirect(`/inventory/transfers/${data.id}`);
}

export async function addTransferItem(transferId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("stock_transfer_items").insert({
    transfer_id: transferId,
    inventory_item_id: String(formData.get("inventory_item_id")),
    quantity: Number(formData.get("quantity")),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/inventory/transfers/${transferId}`);
}

export async function removeTransferItem(transferId: string, itemId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("stock_transfer_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/inventory/transfers/${transferId}`);
}

export async function markTransferInTransit(transferId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("stock_transfers")
    .update({ status: "in_transit" })
    .eq("id", transferId)
    .eq("status", "requested");
  if (error) throw new Error(error.message);
  revalidatePath(`/inventory/transfers/${transferId}`);
  revalidatePath("/inventory/transfers");
}

// Posts the actual stock movement at both ends atomically (see
// receive_stock_transfer in 0017_kitchens_and_transfers.sql) — this is the
// only step that changes property_inventory balances.
export async function receiveTransfer(transferId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.rpc("receive_stock_transfer", {
    p_transfer_id: transferId,
    p_staff_id: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/inventory/transfers/${transferId}`);
  revalidatePath("/inventory/transfers");
  revalidatePath("/inventory/items");
}

export async function cancelTransfer(transferId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("stock_transfers")
    .update({ status: "cancelled" })
    .eq("id", transferId)
    .in("status", ["requested", "in_transit"]);
  if (error) throw new Error(error.message);
  revalidatePath(`/inventory/transfers/${transferId}`);
  revalidatePath("/inventory/transfers");
}
