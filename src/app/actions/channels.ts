"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";
import { syncChannelNow } from "@/lib/channels/sync";
import { parseIcsBusyRanges } from "@/lib/channels/ical";

export async function createChannelConnection(formData: FormData) {
  const { supabase, user, propertyId } = await requireUser();
  const { error } = await supabase.from("channel_connections").insert({
    property_id: propertyId,
    channel_id: String(formData.get("channel_id")),
    external_property_id: (formData.get("external_property_id") as string) || null,
    api_key: (formData.get("api_key") as string) || null,
    api_secret: (formData.get("api_secret") as string) || null,
    ical_import_url: (formData.get("ical_import_url") as string) || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/organization/channels");
}

export async function updateChannelConnection(connectionId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("channel_connections")
    .update({
      external_property_id: (formData.get("external_property_id") as string) || null,
      api_key: (formData.get("api_key") as string) || null,
      api_secret: (formData.get("api_secret") as string) || null,
      ical_import_url: (formData.get("ical_import_url") as string) || null,
    })
    .eq("id", connectionId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/channels");
}

export async function deleteChannelConnection(connectionId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("channel_connections").delete().eq("id", connectionId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/channels");
}

export async function triggerChannelSync(connectionId: string) {
  const { supabase } = await requireUser();
  const result = await syncChannelNow(supabase, connectionId);
  revalidatePath("/organization/channels");
  return result;
}

// Same call as triggerChannelSync — the sync is a full refresh each time
// (not incremental), so "retry" just means "run it again."
export async function retryChannelSync(connectionId: string) {
  return triggerChannelSync(connectionId);
}

export async function mapRatePlanToChannel(connectionId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const ratePlanId = String(formData.get("rate_plan_id"));
  const externalRatePlanId = String(formData.get("external_rate_plan_id"));
  const externalRoomTypeId = (formData.get("external_room_type_id") as string) || null;

  const { error } = await supabase.from("channel_rate_plan_map").upsert(
    {
      channel_connection_id: connectionId,
      rate_plan_id: ratePlanId,
      external_rate_plan_id: externalRatePlanId,
      external_room_type_id: externalRoomTypeId,
    },
    { onConflict: "channel_connection_id,rate_plan_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/organization/channels");
}

export async function unmapRatePlanFromChannel(mapId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("channel_rate_plan_map").delete().eq("id", mapId);
  if (error) throw new Error(error.message);
  revalidatePath("/organization/channels");
}

// Pulls the connection's configured external .ics feed and replaces this
// property's imported-block restrictions for the given room type with
// whatever the feed currently says is busy — a straightforward
// full-replace on every import rather than trying to diff, since the
// feed is the sole source of truth for "what did the other side block."
export async function importIcalFeed(connectionId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const roomTypeId = String(formData.get("room_type_id"));

  const { data: connection, error: connError } = await supabase
    .from("channel_connections")
    .select("id, property_id, ical_import_url")
    .eq("id", connectionId)
    .single();
  if (connError) throw new Error(connError.message);
  if (!connection.ical_import_url) throw new Error("No iCal import URL configured on this connection.");

  let icsText: string;
  try {
    const res = await fetch(connection.ical_import_url);
    if (!res.ok) throw new Error(`Feed returned ${res.status}`);
    icsText = await res.text();
  } catch (err) {
    await supabase.from("channel_sync_log").insert({
      channel_connection_id: connectionId,
      direction: "pull",
      sync_type: "availability",
      status: "failed",
      error_message: err instanceof Error ? err.message : "Could not fetch iCal feed",
    });
    throw new Error(err instanceof Error ? err.message : "Could not fetch iCal feed");
  }

  const ranges = parseIcsBusyRanges(icsText);

  await supabase
    .from("availability_restrictions")
    .delete()
    .eq("property_id", connection.property_id)
    .eq("room_type_id", roomTypeId)
    .eq("notes", `ical-import:${connectionId}`);

  if (ranges.length) {
    const { error } = await supabase.from("availability_restrictions").insert(
      ranges.map((r) => ({
        property_id: connection.property_id,
        room_type_id: roomTypeId,
        start_date: r.start,
        end_date: r.end,
        stop_sell: true,
        notes: `ical-import:${connectionId}`,
        created_by: user.id,
      })),
    );
    if (error) throw new Error(error.message);
  }

  await supabase.from("channel_sync_log").insert({
    channel_connection_id: connectionId,
    direction: "pull",
    sync_type: "availability",
    status: "success",
    payload_summary: `${ranges.length} blocked range${ranges.length === 1 ? "" : "s"} imported`,
  });
  await supabase.from("channel_connections").update({ last_synced_at: new Date().toISOString(), status: "connected" }).eq("id", connectionId);

  revalidatePath("/organization/channels");
  revalidatePath("/organization/restrictions");
}
