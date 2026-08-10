// Real, working iCal (.ics) export/import — no external OTA partnership
// needed. This is genuinely how many small properties keep Airbnb/
// Booking.com calendars in sync without a full certified API integration:
// each side publishes a feed of "blocked" date ranges and imports the
// other's. Only availability blocking travels this way (no rates, no
// restrictions beyond stop-sell, no reservation details) — that's an
// inherent limit of the format, not a shortcut taken here.

export type BusyRange = { start: string; end: string; summary: string };

function toIcsDate(dateStr: string): string {
  return dateStr.replaceAll("-", "");
}

function escapeIcsText(text: string): string {
  return text.replace(/([,;\\])/g, "\\$1");
}

function unescapeIcsText(text: string): string {
  return text.replace(/\\([,;\\])/g, "$1");
}

export function buildIcsFeed(propertyName: string, roomTypeName: string, ranges: BusyRange[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Hotel MIS//Availability Export//EN", `X-WR-CALNAME:${escapeIcsText(`${propertyName} — ${roomTypeName}`)}`];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  for (const range of ranges) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${range.start}-${range.end}-${roomTypeName.replace(/\s+/g, "")}@hotel-mis`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(range.start)}`,
      `DTEND;VALUE=DATE:${toIcsDate(range.end)}`,
      `SUMMARY:${escapeIcsText(range.summary)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// Minimal VEVENT parser — handles the DTSTART/DTEND;VALUE=DATE (all-day)
// form every major OTA/calendar app exports for availability blocks. Line
// folding (a continuation line starting with a space) is unfolded first,
// per RFC 5545.
export function parseIcsBusyRanges(icsText: string): BusyRange[] {
  const unfolded = icsText.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const lines = unfolded.split("\n");

  const ranges: BusyRange[] = [];
  let inEvent = false;
  let start: string | null = null;
  let end: string | null = null;
  let summary = "Blocked";

  const extractDate = (line: string) => {
    const value = line.split(":").slice(1).join(":").trim();
    const digits = value.replace(/[^0-9]/g, "").slice(0, 8);
    if (digits.length !== 8) return null;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      start = null;
      end = null;
      summary = "Blocked";
    } else if (line === "END:VEVENT") {
      if (inEvent && start && end) {
        ranges.push({ start, end, summary });
      }
      inEvent = false;
    } else if (inEvent && line.startsWith("DTSTART")) {
      start = extractDate(line);
    } else if (inEvent && line.startsWith("DTEND")) {
      end = extractDate(line);
    } else if (inEvent && line.startsWith("SUMMARY")) {
      summary = unescapeIcsText(line.split(":").slice(1).join(":").trim()) || "Blocked";
    }
  }

  return ranges;
}
