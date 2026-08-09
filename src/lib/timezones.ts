// Constrained to a fixed list (rather than free text) so every value here is
// guaranteed to be a valid IANA zone Intl.DateTimeFormat accepts — invalid
// input would throw at render time otherwise.
export const TIMEZONES = [
  { id: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { id: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { id: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { id: "Europe/London", label: "Europe/London (GMT/BST)" },
  { id: "Europe/Paris", label: "Europe/Paris (CET)" },
  { id: "America/New_York", label: "America/New_York (ET)" },
  { id: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { id: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
  { id: "UTC", label: "UTC" },
] as const;
