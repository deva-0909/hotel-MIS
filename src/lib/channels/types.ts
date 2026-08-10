// A channel adapter's job is to take this property's current
// availability/rates/restrictions and push them outward, and to turn
// whatever a channel sends back (a webhook payload, or an imported
// calendar) into the same shape our own booking engine already
// understands. Every adapter implements this same shape so the sync
// engine (src/lib/channels/sync.ts) doesn't need to know which channel
// it's talking to.
export type AvailabilityPush = {
  roomTypeExternalId: string | null;
  date: string; // YYYY-MM-DD
  roomsAvailable: number;
  stopSell: boolean;
};

export type RatePush = {
  ratePlanExternalId: string;
  date: string;
  rate: number;
  currency: string;
};

export type RestrictionPush = {
  roomTypeExternalId: string | null;
  date: string;
  minStay: number | null;
  maxStay: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
};

export type PushResult = { success: boolean; error?: string };

export type InboundReservation = {
  externalBookingId: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  externalRoomTypeId: string | null;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  totalAmount: number | null;
  currency: string | null;
};

export type ChannelConnectionCreds = {
  id: string;
  propertyId: string;
  externalPropertyId: string | null;
  apiKey: string | null;
  apiSecret: string | null;
};

// Every adapter is best-effort against that channel's publicly documented
// API shape — none of them have been executed against a live account,
// since that requires the channel's own partner credentials. Verify
// against current API docs before relying on one in production.
export interface ChannelAdapter {
  pushAvailability(conn: ChannelConnectionCreds, items: AvailabilityPush[]): Promise<PushResult>;
  pushRates(conn: ChannelConnectionCreds, items: RatePush[]): Promise<PushResult>;
  pushRestrictions(conn: ChannelConnectionCreds, items: RestrictionPush[]): Promise<PushResult>;
  acknowledgeCancellation(conn: ChannelConnectionCreds, externalBookingId: string): Promise<PushResult>;
}
