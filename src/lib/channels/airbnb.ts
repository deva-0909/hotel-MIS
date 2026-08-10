import type { ChannelAdapter, ChannelConnectionCreds, AvailabilityPush, RatePush, PushResult } from "./types";

// Airbnb's full API (calendar/pricing/reservations) is only issued to
// approved software partners after a business review — an individual
// property generally cannot get these credentials directly, which is why
// Airbnb itself documents iCal export/import as the standard integration
// path for everyone else (see src/lib/channels/ical.ts — that's the real,
// working Airbnb sync in this app). This adapter exists so a connection
// that *does* have partner API credentials can still push through the
// same interface as every other channel, following the general documented
// shape, but it is unverified against a live partner account and pushes
// only availability (Airbnb's model doesn't expose per-channel rate
// plans/restrictions the way traditional OTAs do).
const BASE_URL = "https://api.airbnb.com/v2";

async function post(conn: ChannelConnectionCreds, path: string, body: unknown): Promise<PushResult> {
  if (!conn.apiKey || !conn.externalPropertyId) {
    return {
      success: false,
      error: "Missing API key or listing ID — and note most properties should use the iCal feed for Airbnb rather than this API adapter.",
    };
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${conn.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { success: false, error: `Airbnb returned ${res.status}: ${await res.text().catch(() => "")}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown network error" };
  }
}

export const airbnbAdapter: ChannelAdapter = {
  pushAvailability(conn: ChannelConnectionCreds, items: AvailabilityPush[]) {
    return post(conn, `/listings/${conn.externalPropertyId}/calendar`, {
      days: items.map((i) => ({ date: i.date, available: !i.stopSell && i.roomsAvailable > 0 })),
    });
  },
  async pushRates(conn: ChannelConnectionCreds, items: RatePush[]) {
    if (!items.length) return { success: true };
    return post(conn, `/listings/${conn.externalPropertyId}/calendar`, {
      days: items.map((i) => ({ date: i.date, price: i.rate })),
    });
  },
  async pushRestrictions() {
    return { success: false, error: "Airbnb's calendar model doesn't support restriction pushes through this adapter." };
  },
  acknowledgeCancellation(conn: ChannelConnectionCreds, externalBookingId: string) {
    return post(conn, `/reservations/${externalBookingId}/acknowledge`, {});
  },
};
