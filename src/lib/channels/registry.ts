import type { ChannelAdapter } from "./types";
import { bookingComAdapter } from "./booking-com";
import { expediaAdapter } from "./expedia";
import { airbnbAdapter } from "./airbnb";
import { googleHotelAdapter } from "./google-hotel";
import { makeUnsupportedAdapter } from "./unsupported";

// ical_generic has no push adapter — it's pull/export only, handled
// separately by src/lib/channels/ical.ts and the /api/channels/ical
// route, not through the push-based ChannelAdapter interface.
export const CHANNEL_ADAPTERS: Record<string, ChannelAdapter> = {
  booking_com: bookingComAdapter,
  expedia: expediaAdapter,
  airbnb: airbnbAdapter,
  google_hotel: googleHotelAdapter,
  agoda: makeUnsupportedAdapter("Agoda"),
  makemytrip: makeUnsupportedAdapter("MakeMyTrip"),
  goibibo: makeUnsupportedAdapter("Goibibo"),
};
