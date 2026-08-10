import type { ChannelAdapter, PushResult } from "./types";

// Agoda, MakeMyTrip, and Goibibo don't publish a general-access partner
// API that an individual property can integrate against directly — in
// practice, hotels reach these channels through a certified
// channel-manager aggregator (SiteMinder, RateGain, STAAH, etc.), which
// itself holds the OTA partnership, not through hotel-built API calls.
// Building a direct adapter here would mean guessing at a private API
// surface with no way to verify it — this returns an honest, actionable
// result instead of code that looks like it works but can't be tested or
// trusted.
function unsupported(channelName: string): PushResult {
  return {
    success: false,
    error: `${channelName} doesn't offer a direct property-to-channel API — connect through a certified channel-manager aggregator (e.g. SiteMinder, RateGain, STAAH) that already has this OTA's partnership, and push to that aggregator's API instead.`,
  };
}

export function makeUnsupportedAdapter(channelName: string): ChannelAdapter {
  return {
    async pushAvailability() {
      return unsupported(channelName);
    },
    async pushRates() {
      return unsupported(channelName);
    },
    async pushRestrictions() {
      return unsupported(channelName);
    },
    async acknowledgeCancellation() {
      return unsupported(channelName);
    },
  };
}
