"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";

export async function createInventoryCategory(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("inventory_categories").insert({ name: String(formData.get("name")) });
  if (error) throw new Error(error.message);
  revalidatePath("/inventory/items");
}

// inventory_items is a shared, enterprise-wide catalog — stock levels live
// per-property in property_inventory instead. Creating an item also seeds
// this property's starting stock row for it.
export async function createInventoryItem(formData: FormData) {
  const { supabase, propertyId } = await requireUser();
  const { data: item, error } = await supabase
    .from("inventory_items")
    .insert({
      category_id: (formData.get("category_id") as string) || null,
      name: String(formData.get("name")),
      unit: String(formData.get("unit") || "pcs"),
      unit_cost: Number(formData.get("unit_cost") ?? 0),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: stockError } = await supabase.from("property_inventory").insert({
    property_id: propertyId,
    inventory_item_id: item.id,
    current_stock: Number(formData.get("current_stock") ?? 0),
    reorder_level: Number(formData.get("reorder_level") ?? 0),
  });
  if (stockError) throw new Error(stockError.message);

  revalidatePath("/inventory/items");
}

export async function recordStockMovement(formData: FormData) {
  const { supabase, user, propertyId } = await requireUser();
  const movementType = String(formData.get("movement_type")) as "adjustment" | "consumption" | "wastage";
  const rawQty = Number(formData.get("quantity"));
  const quantity = movementType === "adjustment" ? rawQty : Math.abs(rawQty);

  const { error } = await supabase.from("stock_movements").insert({
    property_id: propertyId,
    inventory_item_id: String(formData.get("inventory_item_id")),
    movement_type: movementType,
    quantity,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/inventory/items");
}

export async function createSupplier(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("suppliers").insert({
    name: String(formData.get("name")),
    contact_person: (formData.get("contact_person") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    address: (formData.get("address") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/inventory/suppliers");
}

export async function createPurchaseOrder(formData: FormData) {
  const { supabase, user, propertyId } = await requireUser();
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      property_id: propertyId,
      supplier_id: String(formData.get("supplier_id")),
      expected_date: (formData.get("expected_date") as string) || null,
      notes: (formData.get("notes") as string) || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/inventory/purchase-orders");
  redirect(`/inventory/purchase-orders/${data.id}`);
}

export async function addPurchaseOrderItem(poId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("purchase_order_items").insert({
    po_id: poId,
    inventory_item_id: String(formData.get("inventory_item_id")),
    quantity: Number(formData.get("quantity")),
    unit_cost: Number(formData.get("unit_cost") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/inventory/purchase-orders/${poId}`);
}

export async function markPurchaseOrderOrdered(poId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("purchase_orders").update({ status: "ordered" }).eq("id", poId);
  if (error) throw new Error(error.message);
  revalidatePath(`/inventory/purchase-orders/${poId}`);
  revalidatePath("/inventory/purchase-orders");
}

const PO_STAGE_ORDER = ["draft", "pending_approval", "approved", "ordered", "received"] as const;

export async function advancePurchaseOrderStage(poId: string, currentStatus: string) {
  const { supabase, user } = await requireUser();
  const idx = PO_STAGE_ORDER.indexOf(currentStatus as (typeof PO_STAGE_ORDER)[number]);
  // partially_received sits outside the linear stage order (it's reached via
  // the itemized receiving flow, not this board) but should still be able to
  // advance straight to fully received.
  const next =
    currentStatus === "partially_received"
      ? "received"
      : idx >= 0 && idx < PO_STAGE_ORDER.length - 1
        ? PO_STAGE_ORDER[idx + 1]
        : null;
  if (!next) throw new Error("Already at the final stage");

  if (next === "received") {
    // Advancing to "GRN Received" must actually receive every outstanding
    // line (via the same RPC the itemized receiving flow uses) so stock
    // levels move too — not just flip the status label.
    const { data: items, error: itemsError } = await supabase
      .from("purchase_order_items")
      .select("id, quantity, received_quantity")
      .eq("po_id", poId);
    if (itemsError) throw new Error(itemsError.message);

    for (const item of items ?? []) {
      const outstanding = item.quantity - item.received_quantity;
      if (outstanding > 0) {
        const { error: receiveError } = await supabase.rpc("receive_po_item", {
          p_po_item_id: item.id,
          p_quantity: outstanding,
          p_staff_id: user.id,
        });
        if (receiveError) throw new Error(receiveError.message);
      }
    }
    if (!items?.length) {
      // No line items to receive — nothing for the RPC to flip the status
      // on, so set it directly rather than leaving the PO stuck.
      const { error } = await supabase.from("purchase_orders").update({ status: "received" }).eq("id", poId);
      if (error) throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("purchase_orders").update({ status: next }).eq("id", poId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/live/purchase-board");
  revalidatePath("/inventory/purchase-orders");
  revalidatePath(`/inventory/purchase-orders/${poId}`);
  revalidatePath("/inventory/items");
}

export async function rejectPurchaseOrder(poId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("purchase_orders").update({ status: "rejected" }).eq("id", poId);
  if (error) throw new Error(error.message);
  revalidatePath("/live/purchase-board");
  revalidatePath("/inventory/purchase-orders");
}

export async function receivePurchaseOrderItem(poId: string, poItemId: string, quantity: number) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.rpc("receive_po_item", {
    p_po_item_id: poItemId,
    p_quantity: quantity,
    p_staff_id: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/inventory/purchase-orders/${poId}`);
  revalidatePath("/inventory/purchase-orders");
  revalidatePath("/inventory/items");
}
