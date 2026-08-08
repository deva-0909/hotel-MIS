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

export async function createInventoryCategory(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("inventory_categories").insert({ name: String(formData.get("name")) });
  if (error) throw new Error(error.message);
  revalidatePath("/inventory/items");
}

export async function createInventoryItem(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("inventory_items").insert({
    category_id: (formData.get("category_id") as string) || null,
    name: String(formData.get("name")),
    unit: String(formData.get("unit") || "pcs"),
    current_stock: Number(formData.get("current_stock") ?? 0),
    reorder_level: Number(formData.get("reorder_level") ?? 0),
    unit_cost: Number(formData.get("unit_cost") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/inventory/items");
}

export async function recordStockMovement(formData: FormData) {
  const { supabase, user } = await requireUser();
  const movementType = String(formData.get("movement_type")) as "adjustment" | "consumption" | "wastage";
  const rawQty = Number(formData.get("quantity"));
  const quantity = movementType === "adjustment" ? rawQty : Math.abs(rawQty);

  const { error } = await supabase.from("stock_movements").insert({
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
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
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
