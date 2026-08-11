import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon-client";

// Real, working webhook receiver — no staff session involved, so every
// write goes through the SECURITY DEFINER RPCs from 0038_webhook_rpcs.sql,
// each scoped to exactly this connectionId's property.
//
// Payload shape here is a generic normalized JSON body:
//   {
//     "event_type": "reservation" | "cancellation" | "modification" | "no_show",
//     "external_booking_id": "...",
//     "guest_name": "...", "guest_email": "...", "guest_phone": "...",
//     "external_room_type_id": "...",   // matched against channel_rate_plan_map
//     "check_in_date": "YYYY-MM-DD", "check_out_date": "YYYY-MM-DD",
//     "adults": 2, "children": 0, "rate_per_night": 2500
//   }
// Real OTA webhooks each have their own payload shape (Booking.com sends
// XML, Expedia sends a differently-shaped JSON reservation object, etc.) —
// normalizing a specific channel's real payload into this shape is a
// small, channel-specific mapping step to add once that channel's actual
// webhook format is confirmed against its docs/sandbox; this route's
// availability-checking, guest-matching, and logging all stay the same
// regardless of which channel is calling it.
//
// Signature/HMAC verification is intentionally not implemented here since
// each channel uses its own scheme — before going live, verify the
// request against that channel's documented signature header using the
// connection's api_secret before trusting the body.

type WebhookPayload = {
  event_type: "ping" | "reservation" | "cancellation" | "modification" | "no_show";
  external_booking_id: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  external_room_type_id?: string;
  check_in_date?: string;
  check_out_date?: string;
  adults?: number;
  children?: number;
  rate_per_night?: number;
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await params;
  const supabase = createAnonClient();

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { data: connection } = await supabase
    .from("channel_connections")
    .select("id, property_id, channels(name), properties(name)")
    .eq("id", connectionId)
    .maybeSingle();
  if (!connection) {
    return NextResponse.json({ error: "Unknown channel connection" }, { status: 404 });
  }

  // A no-op health check — reachable and DB-connected, but touches nothing.
  // This is what the "Send test webhook" button on Organization → Channels
  // calls: it can only be genuinely proven from the browser that's actually
  // loading this deployed route, not from this dev sandbox (its outbound
  // network policy blocks calls to Supabase and to this app's own deployed
  // URL alike) — so the real verification happens the first time someone
  // clicks that button in a real browser.
  if (payload.event_type === "ping") {
    return NextResponse.json({
      ok: true,
      connection_id: connection.id,
      channel: connection.channels?.name ?? null,
      property: connection.properties?.name ?? null,
      received_at: new Date().toISOString(),
    });
  }

  const logResult = async (
    syncType: "reservation" | "cancellation" | "modification" | "no_show",
    status: "success" | "failed",
    errorMessage?: string,
  ) => {
    await supabase.from("channel_sync_log").insert({
      channel_connection_id: connectionId,
      direction: "pull",
      sync_type: syncType,
      status,
      payload_summary: payload.external_booking_id,
      error_message: errorMessage ?? null,
    });
  };

  try {
    if (payload.event_type === "reservation") {
      let roomTypeId: string | null = null;
      if (payload.external_room_type_id) {
        const { data: mapping } = await supabase
          .from("channel_rate_plan_map")
          .select("rate_plans(room_type_id)")
          .eq("channel_connection_id", connectionId)
          .eq("external_room_type_id", payload.external_room_type_id)
          .maybeSingle();
        roomTypeId = mapping?.rate_plans?.room_type_id ?? null;
      }
      if (!roomTypeId) {
        await logResult("reservation", "failed", "No room type mapping found for external_room_type_id");
        return NextResponse.json({ error: "external_room_type_id is not mapped to a room type" }, { status: 422 });
      }
      if (!payload.check_in_date || !payload.check_out_date) {
        await logResult("reservation", "failed", "Missing check_in_date/check_out_date");
        return NextResponse.json({ error: "check_in_date and check_out_date are required" }, { status: 422 });
      }

      const { data: reservationId, error } = await supabase.rpc("webhook_create_reservation", {
        p_connection_id: connectionId,
        p_external_booking_id: payload.external_booking_id,
        p_guest_name: payload.guest_name ?? "Guest",
        // Supabase's generated Args type for this RPC doesn't reflect that
        // the underlying SQL parameters are nullable (text, no NOT NULL) —
        // it genuinely accepts and handles null for both.
        p_guest_email: (payload.guest_email ?? null) as string,
        p_guest_phone: (payload.guest_phone ?? null) as string,
        p_room_type_id: roomTypeId,
        p_check_in: payload.check_in_date,
        p_check_out: payload.check_out_date,
        p_adults: payload.adults ?? 1,
        p_children: payload.children ?? 0,
        p_rate: payload.rate_per_night ?? 0,
      });
      if (error) {
        await logResult("reservation", "failed", error.message);
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      await logResult("reservation", "success");
      return NextResponse.json({ reservation_id: reservationId }, { status: 201 });
    }

    if (payload.event_type === "cancellation") {
      const { error } = await supabase.rpc("webhook_cancel_reservation", {
        p_connection_id: connectionId,
        p_external_booking_id: payload.external_booking_id,
      });
      if (error) {
        await logResult("cancellation", "failed", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      await logResult("cancellation", "success");
      return NextResponse.json({ ok: true });
    }

    if (payload.event_type === "no_show") {
      const { error } = await supabase.rpc("webhook_no_show_reservation", {
        p_connection_id: connectionId,
        p_external_booking_id: payload.external_booking_id,
      });
      if (error) {
        await logResult("no_show", "failed", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      await logResult("no_show", "success");
      return NextResponse.json({ ok: true });
    }

    if (payload.event_type === "modification") {
      if (!payload.check_in_date || !payload.check_out_date) {
        await logResult("modification", "failed", "Missing check_in_date/check_out_date");
        return NextResponse.json({ error: "check_in_date and check_out_date are required" }, { status: 422 });
      }
      const { error } = await supabase.rpc("webhook_modify_reservation", {
        p_connection_id: connectionId,
        p_external_booking_id: payload.external_booking_id,
        p_check_in: payload.check_in_date,
        p_check_out: payload.check_out_date,
        p_adults: payload.adults ?? 1,
        p_children: payload.children ?? 0,
      });
      if (error) {
        await logResult("modification", "failed", error.message);
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      await logResult("modification", "success");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown event_type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
