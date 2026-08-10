import type { createClient } from "@/lib/supabase/server";
import { CHANNEL_ADAPTERS } from "./registry";
import type { AvailabilityPush, RatePush, RestrictionPush, PushResult } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// How far ahead a manual sync pushes — a real channel manager typically
// keeps a rolling 12-18 month window continuously updated via webhooks on
// every change; without that infrastructure here, "sync now" pushes a
// fixed near-term window instead.
const SYNC_WINDOW_DAYS = 60;

async function logSync(
  supabase: Supabase,
  connectionId: string,
  direction: "push" | "pull",
  syncType: "availability" | "rates" | "restrictions",
  result: PushResult,
  count: number,
) {
  await supabase.from("channel_sync_log").insert({
    channel_connection_id: connectionId,
    direction,
    sync_type: syncType,
    status: result.success ? "success" : "failed",
    payload_summary: `${count} item${count === 1 ? "" : "s"}`,
    error_message: result.error ?? null,
  });
}

export async function syncChannelNow(supabase: Supabase, connectionId: string) {
  const { data: connection, error: connError } = await supabase
    .from("channel_connections")
    .select("id, property_id, channel_id, api_key, api_secret, external_property_id, channels(code, name)")
    .eq("id", connectionId)
    .single();
  if (connError) throw new Error(connError.message);

  const code = connection.channels?.code;
  const adapter = code ? CHANNEL_ADAPTERS[code] : undefined;
  if (!adapter) {
    throw new Error(`${connection.channels?.name ?? "This channel"} doesn't push through the API sync — use the iCal feed for it instead.`);
  }

  const { data: property } = await supabase.from("properties").select("currency").eq("id", connection.property_id).single();
  const currency = property?.currency ?? "INR";

  const [{ data: roomTypes }, { data: ratePlans }, { data: mappings }, { data: restrictions }] = await Promise.all([
    supabase.from("room_types").select("id").eq("property_id", connection.property_id),
    supabase.from("rate_plans").select("id, base_rate, room_type_id").eq("property_id", connection.property_id).eq("is_active", true),
    supabase
      .from("channel_rate_plan_map")
      .select("rate_plan_id, external_rate_plan_id, external_room_type_id")
      .eq("channel_connection_id", connectionId)
      .eq("is_active", true),
    supabase
      .from("availability_restrictions")
      .select("room_type_id, start_date, end_date, min_stay, max_stay, closed_to_arrival, closed_to_departure, stop_sell")
      .eq("property_id", connection.property_id),
  ]);

  const startDate = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + SYNC_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
  const dateRange: string[] = [];
  for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
    dateRange.push(d.toISOString().slice(0, 10));
  }

  const externalRoomTypeIdFor = (roomTypeId: string): string | null => {
    const rp = (ratePlans ?? []).find((r) => r.room_type_id === roomTypeId);
    const mapping = rp ? (mappings ?? []).find((m) => m.rate_plan_id === rp.id) : undefined;
    return mapping?.external_room_type_id ?? null;
  };

  const restrictionsFor = (roomTypeId: string, date: string) =>
    (restrictions ?? []).find((r) => r.room_type_id === roomTypeId && r.start_date <= date && r.end_date >= date);

  const creds = {
    id: connection.id,
    propertyId: connection.property_id,
    externalPropertyId: connection.external_property_id,
    apiKey: connection.api_key,
    apiSecret: connection.api_secret,
  };

  const availabilityItems: AvailabilityPush[] = [];
  const restrictionItems: RestrictionPush[] = [];
  for (const rt of roomTypes ?? []) {
    const { data: counts } = await supabase.rpc("available_room_counts_for_range", {
      p_room_type_id: rt.id,
      p_start_date: startDate,
      p_end_date: endDate,
    });
    const externalRoomTypeId = externalRoomTypeIdFor(rt.id);
    for (const c of counts ?? []) {
      const restriction = restrictionsFor(rt.id, c.stay_date);
      availabilityItems.push({
        roomTypeExternalId: externalRoomTypeId,
        date: c.stay_date,
        roomsAvailable: c.available_count,
        stopSell: restriction?.stop_sell ?? false,
      });
    }
    for (const date of dateRange) {
      const restriction = restrictionsFor(rt.id, date);
      if (!restriction) continue;
      restrictionItems.push({
        roomTypeExternalId: externalRoomTypeId,
        date,
        minStay: restriction.min_stay,
        maxStay: restriction.max_stay,
        closedToArrival: restriction.closed_to_arrival,
        closedToDeparture: restriction.closed_to_departure,
      });
    }
  }

  const rateItems: RatePush[] = [];
  for (const rp of ratePlans ?? []) {
    const mapping = (mappings ?? []).find((m) => m.rate_plan_id === rp.id);
    if (!mapping) continue;
    for (const date of dateRange) {
      rateItems.push({ ratePlanExternalId: mapping.external_rate_plan_id, date, rate: rp.base_rate, currency });
    }
  }

  const [availabilityResult, ratesResult, restrictionsResult] = await Promise.all([
    adapter.pushAvailability(creds, availabilityItems),
    rateItems.length ? adapter.pushRates(creds, rateItems) : Promise.resolve<PushResult>({ success: true }),
    restrictionItems.length ? adapter.pushRestrictions(creds, restrictionItems) : Promise.resolve<PushResult>({ success: true }),
  ]);

  await Promise.all([
    logSync(supabase, connectionId, "push", "availability", availabilityResult, availabilityItems.length),
    logSync(supabase, connectionId, "push", "rates", ratesResult, rateItems.length),
    logSync(supabase, connectionId, "push", "restrictions", restrictionsResult, restrictionItems.length),
  ]);

  const allSucceeded = availabilityResult.success && ratesResult.success && restrictionsResult.success;
  const firstError = [availabilityResult, ratesResult, restrictionsResult].find((r) => !r.success)?.error ?? null;

  await supabase
    .from("channel_connections")
    .update({
      status: allSucceeded ? "connected" : "error",
      last_synced_at: new Date().toISOString(),
      last_error: firstError,
    })
    .eq("id", connectionId);

  return { success: allSucceeded, error: firstError };
}
