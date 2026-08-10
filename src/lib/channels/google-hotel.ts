import type { ChannelAdapter, ChannelConnectionCreds, AvailabilityPush, RatePush, RestrictionPush, PushResult } from "./types";

// Google Hotel Ads / Hotel Center is feed-based (typically a batch
// rate/availability feed delivered via the Hotel Prices API), not a
// per-booking reservation channel — Google redirects the booker to your
// own site or a connected OTA/booking engine rather than sending a
// reservation itself, so there's no acknowledgeCancellation call here in
// the usual sense. Shape follows the documented Hotel Prices API as I
// understand it; unverified against a live Hotel Center account.
const BASE_URL = "https://www.googleapis.com/hotels/v1";

async function post(conn: ChannelConnectionCreds, path: string, body: unknown): Promise<PushResult> {
  if (!conn.apiKey || !conn.externalPropertyId) {
    return { success: false, error: "Missing API key or Google Hotel Center property ID on this connection." };
  }
  try {
    const res = await fetch(`${BASE_URL}${path}?key=${encodeURIComponent(conn.apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { success: false, error: `Google Hotel Center returned ${res.status}: ${await res.text().catch(() => "")}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown network error" };
  }
}

export const googleHotelAdapter: ChannelAdapter = {
  pushAvailability(conn: ChannelConnectionCreds, items: AvailabilityPush[]) {
    return post(conn, "/availability:batchUpdate", {
      hotelId: conn.externalPropertyId,
      entries: items.map((i) => ({ roomTypeId: i.roomTypeExternalId, date: i.date, available: !i.stopSell && i.roomsAvailable > 0 })),
    });
  },
  pushRates(conn: ChannelConnectionCreds, items: RatePush[]) {
    return post(conn, "/prices:batchUpdate", {
      hotelId: conn.externalPropertyId,
      entries: items.map((i) => ({ ratePlanId: i.ratePlanExternalId, date: i.date, baseRate: { amount: i.rate, currency: i.currency } })),
    });
  },
  pushRestrictions(conn: ChannelConnectionCreds, items: RestrictionPush[]) {
    return post(conn, "/restrictions:batchUpdate", {
      hotelId: conn.externalPropertyId,
      entries: items.map((i) => ({
        roomTypeId: i.roomTypeExternalId,
        date: i.date,
        minStay: i.minStay,
        maxStay: i.maxStay,
        closedToArrival: i.closedToArrival,
        closedToDeparture: i.closedToDeparture,
      })),
    });
  },
  async acknowledgeCancellation() {
    // No booking channel to acknowledge against — Google Hotel Ads doesn't
    // hold the reservation.
    return { success: true };
  },
};
