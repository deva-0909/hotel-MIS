export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type DayKey = (typeof DAYS)[number];

export type DayHours = { open: string; close: string; closed: boolean };
export type WorkingHours = Record<DayKey, DayHours>;

export const DEFAULT_WORKING_HOURS: WorkingHours = Object.fromEntries(
  DAYS.map((d) => [d, { open: "00:00", close: "23:59", closed: false }]),
) as WorkingHours;

// Accepts whatever came back from the jsonb column — falls back to the
// always-open default for any day that's missing or malformed rather than
// treating it as closed, since a partially-configured property shouldn't
// silently start rejecting orders.
export function parseWorkingHours(raw: unknown): WorkingHours {
  const value = (raw ?? {}) as Partial<Record<string, Partial<DayHours>>>;
  const result = {} as WorkingHours;
  for (const day of DAYS) {
    const d = value[day];
    result[day] = {
      open: typeof d?.open === "string" ? d.open : "00:00",
      close: typeof d?.close === "string" ? d.close : "23:59",
      closed: d?.closed === true,
    };
  }
  return result;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Is the property open right now, in its own timezone? Handles overnight
// spans (e.g. open 18:00, close 02:00) by wrapping past midnight instead of
// treating close < open as a configuration error.
export function isWithinWorkingHours(workingHours: WorkingHours, timezone: string, at: Date = new Date()): boolean {
  const dayName = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" }).format(at).toLowerCase() as DayKey;
  const hours = workingHours[dayName];
  if (!hours || hours.closed) return false;

  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
  const nowMin = toMinutes(timeStr === "24:00" ? "00:00" : timeStr);
  const openMin = toMinutes(hours.open);
  const closeMin = toMinutes(hours.close);

  if (openMin <= closeMin) {
    return nowMin >= openMin && nowMin <= closeMin;
  }
  // Overnight: open today, closes after midnight tomorrow.
  return nowMin >= openMin || nowMin <= closeMin;
}
