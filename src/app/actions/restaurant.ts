"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { parseWorkingHours, isWithinWorkingHours } from "@/lib/working-hours";
import { channelPriceFor } from "@/lib/menu-pricing";

export async function createTable(formData: FormData) {
  const { supabase } = await requireUser();
  const serviceAreaId = (formData.get("service_area_id") as string) || null;
  const { error } = await supabase.from("restaurant_tables").insert({
    restaurant_id: String(formData.get("restaurant_id")),
    table_number: String(formData.get("table_number")),
    capacity: Number(formData.get("capacity") ?? 2),
    service_area_id: serviceAreaId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/tables");
}

// A category's kitchen_id is what routes its items' tickets to a specific
// kitchen's queue (see /departments/kitchen) — leaving it unset keeps the
// item local to this restaurant's own property, matching pre-kitchens
// behavior.
export async function createMenuCategory(formData: FormData) {
  const { supabase } = await requireUser();
  const kitchenId = (formData.get("kitchen_id") as string) || null;
  const { error } = await supabase.from("menu_categories").insert({
    restaurant_id: String(formData.get("restaurant_id")),
    name: String(formData.get("name")),
    sort_order: Number(formData.get("sort_order") ?? 0),
    kitchen_id: kitchenId,
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

export async function updateItemMealPeriod(itemId: string, mealPeriodId: string | null) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_items").update({ meal_period_id: mealPeriodId }).eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function createMealPeriod(formData: FormData) {
  const { supabase } = await requireUser();
  const days = formData.getAll("days_of_week") as string[];
  const { error } = await supabase.from("meal_periods").insert({
    restaurant_id: String(formData.get("restaurant_id")),
    name: String(formData.get("name")),
    start_time: String(formData.get("start_time")),
    end_time: String(formData.get("end_time")),
    days_of_week: days.length ? days : ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function deleteMealPeriod(periodId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("meal_periods").delete().eq("id", periodId);
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function createMenuItemVariant(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_item_variants").insert({
    menu_item_id: String(formData.get("menu_item_id")),
    name: String(formData.get("name")),
    price_delta: Number(formData.get("price_delta") ?? 0),
    is_default: formData.get("is_default") === "on",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function deleteMenuItemVariant(variantId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_item_variants").delete().eq("id", variantId);
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function createModifierGroup(formData: FormData) {
  const { supabase } = await requireUser();
  const scope = String(formData.get("scope"));
  const { error } = await supabase.from("menu_modifier_groups").insert({
    menu_item_id: scope === "item" ? (formData.get("menu_item_id") as string) : null,
    category_id: scope === "category" ? (formData.get("category_id") as string) : null,
    name: String(formData.get("name")),
    selection_type: String(formData.get("selection_type") || "single"),
    is_required: formData.get("is_required") === "on",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function deleteModifierGroup(groupId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_modifier_groups").delete().eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function createModifier(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_modifiers").insert({
    group_id: String(formData.get("group_id")),
    name: String(formData.get("name")),
    price_delta: Number(formData.get("price_delta") ?? 0),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function deleteModifier(modifierId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_modifiers").delete().eq("id", modifierId);
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function createCombo(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_combos").insert({
    restaurant_id: String(formData.get("restaurant_id")),
    name: String(formData.get("name")),
    price: Number(formData.get("price") ?? 0),
    description: (formData.get("description") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function toggleComboAvailability(comboId: string, available: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_combos").update({ is_available: available }).eq("id", comboId);
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function addComboItem(formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_combo_items").insert({
    combo_id: String(formData.get("combo_id")),
    menu_item_id: String(formData.get("menu_item_id")),
    quantity: Number(formData.get("quantity") ?? 1),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function removeComboItem(comboItemId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_combo_items").delete().eq("id", comboItemId);
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function createUpsell(formData: FormData) {
  const { supabase } = await requireUser();
  const menuItemId = String(formData.get("menu_item_id"));
  const suggestedItemId = String(formData.get("suggested_item_id"));
  if (menuItemId === suggestedItemId) throw new Error("An item can't upsell itself");
  const { error } = await supabase.from("menu_item_upsells").insert({
    menu_item_id: menuItemId,
    suggested_item_id: suggestedItemId,
    note: (formData.get("note") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function deleteUpsell(upsellId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("menu_item_upsells").delete().eq("id", upsellId);
  if (error) throw new Error(error.message);
  revalidatePath("/restaurant/menu");
}

export async function createOrder(formData: FormData) {
  const { supabase, user, propertyId } = await requireUser();
  const orderType = String(formData.get("order_type"));
  const tableId = (formData.get("table_id") as string) || null;
  const reservationId = (formData.get("reservation_id") as string) || null;
  const billToRoom = formData.get("bill_to_room") === "on" && !!reservationId;

  const { data: property } = await supabase
    .from("properties")
    .select("working_hours, timezone")
    .eq("id", propertyId)
    .single();
  if (property && !isWithinWorkingHours(parseWorkingHours(property.working_hours), property.timezone)) {
    throw new Error("This restaurant is currently closed. Check Property Settings for its working hours.");
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      property_id: propertyId,
      order_type: orderType as "dine_in" | "room_service" | "takeaway" | "delivery_own" | "delivery_aggregator",
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

// unit_price is the one number billOrder()/invoicing ever reads — it's the
// channel price (dine-in/parcel/own-delivery/aggregator, whichever this
// order's order_type maps to — see channelPriceFor(), the fix for the gap
// where every channel silently billed at the dine-in rate) plus the picked
// variant's price_delta plus every selected modifier's price_delta, all
// folded in at order time. order_item_modifiers is purely a record of what
// was picked, for the kitchen ticket and the bill's line-item detail — it
// doesn't carry its own financial weight the invoice needs to re-sum.
export async function addOrderItem(orderId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const menuItemId = String(formData.get("menu_item_id"));
  const variantId = (formData.get("variant_id") as string) || null;
  const modifierIds = formData.getAll("modifier_ids") as string[];
  const quantity = Number(formData.get("quantity") ?? 1);

  const { data: order, error: orderError } = await supabase.from("orders").select("order_type").eq("id", orderId).single();
  if (orderError) throw new Error(orderError.message);

  const { data: menuItem, error: menuError } = await supabase
    .from("menu_items")
    .select("price, parcel_price, own_delivery_price, aggregator_price")
    .eq("id", menuItemId)
    .single();
  if (menuError) throw new Error(menuError.message);

  let unitPrice = channelPriceFor(menuItem, order.order_type);

  if (variantId) {
    const { data: variant, error: variantError } = await supabase.from("menu_item_variants").select("price_delta").eq("id", variantId).single();
    if (variantError) throw new Error(variantError.message);
    unitPrice += Number(variant.price_delta);
  }

  let selectedModifiers: { id: string; name: string; price_delta: number }[] = [];
  if (modifierIds.length) {
    const { data: modifiers, error: modifiersError } = await supabase
      .from("menu_modifiers")
      .select("id, name, price_delta")
      .in("id", modifierIds);
    if (modifiersError) throw new Error(modifiersError.message);
    selectedModifiers = modifiers ?? [];
    unitPrice += selectedModifiers.reduce((sum, m) => sum + Number(m.price_delta), 0);
  }

  const { data: orderItem, error } = await supabase
    .from("order_items")
    .insert({ order_id: orderId, menu_item_id: menuItemId, variant_id: variantId, quantity, unit_price: unitPrice })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (selectedModifiers.length) {
    const { error: modInsertError } = await supabase.from("order_item_modifiers").insert(
      selectedModifiers.map((m) => ({
        order_item_id: orderItem.id,
        modifier_id: m.id,
        modifier_name: m.name,
        price_delta: m.price_delta,
      })),
    );
    if (modInsertError) throw new Error(modInsertError.message);
  }

  revalidatePath(`/restaurant/orders/${orderId}`);
}

export async function addComboOrderItem(orderId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const comboId = String(formData.get("combo_id"));
  const quantity = Number(formData.get("quantity") ?? 1);

  const { data: combo, error: comboError } = await supabase.from("menu_combos").select("price").eq("id", comboId).single();
  if (comboError) throw new Error(comboError.message);

  const { error } = await supabase.from("order_items").insert({ order_id: orderId, combo_id: comboId, quantity, unit_price: combo.price });
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
    .select("id, bill_to_room, guest_id, order_number, property_id, reservations(guest_id)")
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

  // Not billed to the room, but the order may still be tied to an in-house
  // guest (e.g. room-service paid on the spot) — use that guest's record
  // instead of always falling back to an anonymous walk-in.
  let guestId = order.guest_id ?? order.reservations?.guest_id ?? null;
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
    .select("id, quantity, unit_price, menu_items(name), menu_combos(name)")
    .eq("order_id", orderId)
    .neq("status", "cancelled");
  if (itemsError) throw new Error(itemsError.message);

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      guest_id: guestId,
      order_id: orderId,
      property_id: order.property_id,
      status: "draft",
      issued_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (invoiceError) throw new Error(invoiceError.message);

  const lineItems = (items ?? []).map((item) => ({
    invoice_id: invoice.id,
    description: item.menu_items?.name ?? item.menu_combos?.name ?? "Item",
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
