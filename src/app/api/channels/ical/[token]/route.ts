import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { buildIcsFeed } from "@/lib/channels/ical";

// Public, unauthenticated .ics feed — this is the URL an admin pastes into
// Airbnb's/Booking.com's "import calendar" field. Auth is the token itself
// (channel_connections.ical_export_token), same trust model every
// calendar-sync feed like this uses.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const roomTypeId = request.nextUrl.searchParams.get("room_type");
  if (!roomTypeId) {
    return NextResponse.json({ error: "room_type query param is required" }, { status: 400 });
  }

  const supabase = createAnonClient();

  const { data: property } = await supabase
    .from("channel_connections")
    .select("properties(name)")
    .eq("ical_export_token", token)
    .maybeSingle();
  if (!property) {
    return NextResponse.json({ error: "Invalid feed token" }, { status: 404 });
  }

  const { data: roomType } = await supabase.from("room_types").select("name").eq("id", roomTypeId).maybeSingle();

  const { data: ranges, error } = await supabase.rpc("get_busy_ranges_for_ical", { p_token: token, p_room_type_id: roomTypeId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const ics = buildIcsFeed(
    property.properties?.name ?? "Property",
    roomType?.name ?? "Room",
    (ranges ?? []).map((r) => ({ start: r.start_date, end: r.end_date, summary: "Reserved" })),
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="availability.ics"',
    },
  });
}
