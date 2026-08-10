import type { ChannelAdapter, ChannelConnectionCreds, AvailabilityPush, RatePush, RestrictionPush, PushResult } from "./types";

// Booking.com does not offer a self-serve public API for individual
// properties — connectivity is either through their XML-based
// Connectivity Provider program (requires becoming a certified
// "connectivity partner", a business process, not just an API key) or
// through a third-party channel manager they've already certified
// (SiteMinder, RateGain, etc.). This adapter follows the general shape of
// their documented push-model XML API for a direct connectivity partner,
// but is unverified — most properties will actually reach Booking.com
// through a channel-manager aggregator rather than this adapter directly.
// iCal (src/lib/channels/ical.ts) is the realistic option for
// availability-only sync without going through certification.
const BASE_URL = "https://supply-xml.booking.com/hotels/xml";

function buildXmlEnvelope(conn: ChannelConnectionCreds, action: string, bodyXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <username>${conn.apiKey ?? ""}</username>
  <password>${conn.apiSecret ?? ""}</password>
  <hotel_id>${conn.externalPropertyId ?? ""}</hotel_id>
  <action>${action}</action>
  ${bodyXml}
</request>`;
}

async function postXml(conn: ChannelConnectionCreds, action: string, bodyXml: string): Promise<PushResult> {
  if (!conn.apiKey || !conn.apiSecret || !conn.externalPropertyId) {
    return { success: false, error: "Missing username/password/hotel ID on this connection." };
  }
  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: buildXmlEnvelope(conn, action, bodyXml),
    });
    if (!res.ok) {
      return { success: false, error: `Booking.com returned ${res.status}: ${await res.text().catch(() => "")}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown network error" };
  }
}

export const bookingComAdapter: ChannelAdapter = {
  pushAvailability(conn: ChannelConnectionCreds, items: AvailabilityPush[]) {
    const rows = items
      .map((i) => `<availability room_id="${i.roomTypeExternalId ?? ""}" date="${i.date}" rooms_to_sell="${i.stopSell ? 0 : i.roomsAvailable}" />`)
      .join("\n  ");
    return postXml(conn, "update_ari", `<availabilities>\n  ${rows}\n  </availabilities>`);
  },
  pushRates(conn: ChannelConnectionCreds, items: RatePush[]) {
    const rows = items.map((i) => `<rate rate_plan_id="${i.ratePlanExternalId}" date="${i.date}" amount="${i.rate}" currency="${i.currency}" />`).join("\n  ");
    return postXml(conn, "update_ari", `<rates>\n  ${rows}\n  </rates>`);
  },
  pushRestrictions(conn: ChannelConnectionCreds, items: RestrictionPush[]) {
    const rows = items
      .map(
        (i) =>
          `<restriction room_id="${i.roomTypeExternalId ?? ""}" date="${i.date}" min_stay="${i.minStay ?? ""}" max_stay="${i.maxStay ?? ""}" closed_to_arrival="${i.closedToArrival ? 1 : 0}" closed_to_departure="${i.closedToDeparture ? 1 : 0}" />`,
      )
      .join("\n  ");
    return postXml(conn, "update_ari", `<restrictions>\n  ${rows}\n  </restrictions>`);
  },
  acknowledgeCancellation(conn: ChannelConnectionCreds, externalBookingId: string) {
    return postXml(conn, "ack_cancellation", `<reservation_id>${externalBookingId}</reservation_id>`);
  },
};
