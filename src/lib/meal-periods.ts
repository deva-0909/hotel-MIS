// Same minute-of-day comparison approach as isWithinWorkingHours() in
// working-hours.ts, applied to one meal period instead of a property's
// daily hours — handles an overnight span (e.g. a late-night menu running
// 22:00-02:00) the same way, by wrapping past midnight rather than
// treating end < start as misconfigured.
export type MealPeriod = { start_time: string; end_time: string; days_of_week: string[]; is_active: boolean };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isWithinMealPeriod(period: MealPeriod, timezone: string, at: Date = new Date()): boolean {
  if (!period.is_active) return false;

  const dayName = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" }).format(at).toLowerCase();
  if (!period.days_of_week.includes(dayName)) return false;

  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
  const nowMin = toMinutes(timeStr === "24:00" ? "00:00" : timeStr);
  const startMin = toMinutes(period.start_time.slice(0, 5));
  const endMin = toMinutes(period.end_time.slice(0, 5));

  if (startMin <= endMin) return nowMin >= startMin && nowMin <= endMin;
  return nowMin >= startMin || nowMin <= endMin;
}
