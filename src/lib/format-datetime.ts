// Every property has a timezone (defaults to Asia/Kolkata — see
// 0023_timezone.sql); these are the property-aware equivalents of
// .toLocaleString()/.toLocaleDateString()/.toLocaleTimeString(), which
// otherwise render in the server's or browser's own timezone rather than
// the property being viewed.
const DEFAULT_TZ = "Asia/Kolkata";

export function formatDateTime(iso: string, timezone: string = DEFAULT_TZ, options?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

export function formatDate(iso: string, timezone: string = DEFAULT_TZ, options?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

export function formatTime(iso: string, timezone: string = DEFAULT_TZ, options?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

// "Today" in the property's own timezone, as YYYY-MM-DD — not the server's
// UTC calendar date, which can be a different day for several hours around
// midnight UTC depending on the property's offset.
export function getPropertyToday(timezone: string = DEFAULT_TZ): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

// How far `timezone`'s wall clock is ahead of UTC at the given instant, in
// milliseconds (handles DST since it's computed at that instant, not a
// fixed offset).
function timezoneOffsetMs(at: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUTC - at.getTime();
}

// Start/end of "today" in the property's timezone, as UTC instants — for
// filtering timestamptz columns (created_at, scheduled_at) by property-local
// calendar day, where a plain date-string comparison won't work.
export function getPropertyDayBounds(timezone: string = DEFAULT_TZ): { start: string; end: string } {
  const now = new Date();
  const offsetMs = timezoneOffsetMs(now, timezone);
  const localNow = new Date(now.getTime() + offsetMs);
  const localMidnight = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()));
  const start = new Date(localMidnight.getTime() - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
