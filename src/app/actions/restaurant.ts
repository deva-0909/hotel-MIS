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

export async function createTable(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("restaurant_tables").insert({
    table_number: String(formData.get("table_number")),
    capacity: Number(formData.get("capacity") ?? 2),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/tables");
}

export async function createMenuCategory(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_categories").insert({
    name: String(formData.get("name")),
    sort_order: Number(formData.get("sort_order") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function createMenuItem(formData: FormData) {
  const { supabase } = await requireUser();
  const parcel = formData.get("parcel_price") as string;
  const ownDelivery = formData.get("own_delivery_price") as string;
  const aggregator = formData.get("aggregator_price") as string;
  const { error } = await supabase.from("menu_items").insert({
    category_id: String(formData.get("category_id")),
    name: String(formData.get("name")),
    price: Number(formData.get("price") ?? 0),
    parcel_price: parcel ? Number(parcel) : null,
    own_delivery_price: ownDelivery ? Number(ownDelivery) : null,
    aggregator_price: aggregator ? Number(aggregator) : null,
    is_veg: formData.get("is_veg") === "on",
    description: (formData.get("description") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function toggleMenuItemAvailability(itemId: string, available: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_items").update({ is_available: available }).eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function createOrder(formData: FormData) {
  const { supabase, user } = await requireUser();
  const orderType = String(formData.get("order_type"));
  const tableId = (formData.get("table_id") as string) || null;
  const reservationId = (formData.get("reservation_id") as string) || null;
  const billToRoom = formData.get("bill_to_room") === "on" && !!reservationId;

  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_type: orderType as "dine_in" | "room_service" | "takeaway",
      table_id: orderType === "dine_in" ? tableId : null,
      reservation_id: reservationId,
      bill_to_room: billToRoom,
      waiter_id: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/orders");
  redirect(`/restaurant/orders/${data.id}`);
}

export async function addOrderItem(orderId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const menuItemId = String(formData.get("menu_item_id"));
  const quantity = Number(formData.get("quantity") ?? 1);

  const { data: menuItem, error: menuError } = await supabase
    .from("menu_items")
    .select("price")
    .eq("id", menuItemId)
    .single();
  if (menuError) throw new Error(menuError.message);

  const { error } = await supabase.from("order_items").insert({
    order_id: orderId,
    menu_item_id: menuItemId,
    quantity,
    unit_price: menuItem.price,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/restaurant/orders/${orderId}`);
}

export async function removeOrderItem(orderId: string, itemId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("order_items").update({ status: "cancelled" }).eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/restaurant/orders/${orderId}`);
}

export async function sendOrderToKitchen(orderId: string) {
  const { supabase } = await requireUser();
  const now = new Date().toISOString();
  await supabase
    .from("order_items")
    .update({ status: "preparing", kot_sent_at: now })
    .eq("order_id", orderId)
    .eq("status", "pending");
  const { error } = await supabase.from("orders").update({ status: "sent_to_kitchen" }).eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/restaurant/orders/${orderId}`);
  revalidatePath("/restaurant/orders");
}

export async function markOrderReady(orderId: string) {
  const { supabase } = await requireUser();
  await supabase.from("order_items").update({ status: "ready" }).eq("order_id", orderId).eq("status", "preparing");
  const { error } = await supabase.from("orders").update({ status: "ready" }).eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/restaurant/orders/${orderId}`);
  revalidatePath("/restaurant/orders");
}

export async function markOrderServed(orderId: string) {
  const { supabase } = await requireUser();
  await supabase.from("order_items").update({ status: "served" }).eq("order_id", orderId).neq("status", "cancelled");
  const { error } = await supabase.from("orders").update({ status: "served" }).eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/restaurant/orders/${orderId}`);
  revalidatePath("/restaurant/orders");
}

export async function cancelOrder(orderId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
  if (error) throw new Error(error.message);
  revalidatePath(`/restaurant/orders/${orderId}`);
  revalidatePath("/restaurant/orders");
}

// Bills the order. Room-service orders billed to the room just get flagged
// 'billed' — a database trigger posts the charge to the guest's folio.
// Everything else generates a standalone invoice right away (walk-in guests
// get an auto-created placeholder guest record so invoices.guest_id can stay
// required).
export async function billOrder(orderId: string) {
  const { supabase, user } = await requireUser();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, bill_to_room, guest_id, order_number")
    .eq("id", orderId)
    .single();
  if (orderError) throw new Error(orderError.message);

  if (order.bill_to_room) {
    const { error } = await supabase.from("orders").update({ status: "billed" }).eq("id", orderId);
    if (error) throw new Error(error.message);
    revalidatePath(`/restaurant/orders/${orderId}`);
    revalidatePath("/restaurant/orders");
    return;
  }

  let guestId = order.guest_id;
  if (!guestId) {
    const { data: walkIn, error: guestError } = await supabase
      .from("guests")
      .insert({ full_name: "Walk-in Guest", created_by: user.id })
      .select("id")
      .single();
    if (guestError) throw new Error(guestError.message);
    guestId = walkIn.id;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id, quantity, unit_price, menu_items(name)")
    .eq("order_id", orderId)
    .neq("status", "cancelled");
  if (itemsError) throw new Error(itemsError.message);

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({ guest_id: guestId, order_id: orderId, status: "draft", issued_at: new Date().toISOString(), created_by: user.id })
    .select("id")
    .single();
  if (invoiceError) throw new Error(invoiceError.message);

  const lineItems = (items ?? []).map((item) => ({
    invoice_id: invoice.id,
    description: item.menu_items?.name ?? "Item",
    source_type: "restaurant" as const,
    source_table: "order_items",
    source_id: item.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    amount: item.quantity * item.unit_price,
  }));
  if (lineItems.length) {
    const { error: lineError } = await supabase.from("invoice_line_items").insert(lineItems);
    if (lineError) throw new Error(lineError.message);
  }

  await supabase.from("invoices").update({ status: "issued" }).eq("id", invoice.id).gt("total_amount", 0);
  await supabase.from("orders").update({ status: "billed" }).eq("id", orderId);

  revalidatePath(`/restaurant/orders/${orderId}`);
  revalidatePath("/restaurant/orders");
  redirect(`/billing/invoices/${invoice.id}`);
}
