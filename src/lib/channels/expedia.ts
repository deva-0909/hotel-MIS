import type { ChannelAdapter, ChannelConnectionCreds, AvailabilityPush, RatePush, RestrictionPush, PushResult } from "./types";

// Expedia Partner Solutions' EPS Rapid API is REST/JSON with documented
// public shapes (unlike most other OTAs here) — this follows that
// documented shape, but has never been run against a real Expedia
// sandbox/production account, since that requires Expedia's own partner
// credentials. Verify against current EPS Rapid docs before relying on
// this in production; endpoint paths and auth details do change.
const BASE_URL = "https://api.expediapartnersolutions.com/v3";

function authHeaders(conn: ChannelConnectionCreds): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${conn.apiKey ?? ""}`,
    "X-Expedia-Property-Id": conn.externalPropertyId ?? "",
  };
}

async function post(conn: ChannelConnectionCreds, path: string, body: unknown): Promise<PushResult> {
  if (!conn.apiKey || !conn.externalPropertyId) {
    return { success: false, error: "Missing API key or Expedia property ID on this connection." };
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers: authHeaders(conn), body: JSON.stringify(body) });
    if (!res.ok) {
      return { success: false, error: `Expedia returned ${res.status}: ${await res.text().catch(() => "")}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown network error" };
  }
}

export const expediaAdapter: ChannelAdapter = {
  pushAvailability(conn: ChannelConnectionCreds, items: AvailabilityPush[]) {
    return post(conn, "/availability", {
      propertyId: conn.externalPropertyId,
      availabilities: items.map((i) => ({ roomTypeId: i.roomTypeExternalId, date: i.date, availableCount: i.stopSell ? 0 : i.roomsAvailable })),
    });
  },
  pushRates(conn: ChannelConnectionCreds, items: RatePush[]) {
    return post(conn, "/rates", {
      propertyId: conn.externalPropertyId,
      rates: items.map((i) => ({ ratePlanId: i.ratePlanExternalId, date: i.date, amount: i.rate, currency: i.currency })),
    });
  },
  pushRestrictions(conn: ChannelConnectionCreds, items: RestrictionPush[]) {
    return post(conn, "/restrictions", {
      propertyId: conn.externalPropertyId,
      restrictions: items.map((i) => ({
        roomTypeId: i.roomTypeExternalId,
        date: i.date,
        minLengthOfStay: i.minStay,
        maxLengthOfStay: i.maxStay,
        closedToArrival: i.closedToArrival,
        closedToDeparture: i.closedToDeparture,
      })),
    });
  },
  acknowledgeCancellation(conn: ChannelConnectionCreds, externalBookingId: string) {
    return post(conn, `/reservations/${externalBookingId}/acknowledge-cancellation`, {});
  },
};
