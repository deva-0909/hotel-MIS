export type BookingPolicy = {
  cancellation_free_hours: number;
  cancellation_fee_percent: number;
  no_show_fee_percent: number;
  deposit_type: "none" | "percent" | "fixed";
  deposit_percent: number;
  deposit_amount: number;
};

export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  cancellation_free_hours: 24,
  cancellation_fee_percent: 0,
  no_show_fee_percent: 0,
  deposit_type: "none",
  deposit_percent: 0,
  deposit_amount: 0,
};

// Falls back to the zero-fee/no-deposit default for anything missing or
// malformed, matching exactly what cancellation/no-show did before this
// policy existed — nothing is charged until an admin configures a real one.
export function parseBookingPolicy(raw: unknown): BookingPolicy {
  const v = (raw ?? {}) as Partial<BookingPolicy>;
  return {
    cancellation_free_hours:
      typeof v.cancellation_free_hours === "number" ? v.cancellation_free_hours : DEFAULT_BOOKING_POLICY.cancellation_free_hours,
    cancellation_fee_percent: typeof v.cancellation_fee_percent === "number" ? v.cancellation_fee_percent : 0,
    no_show_fee_percent: typeof v.no_show_fee_percent === "number" ? v.no_show_fee_percent : 0,
    deposit_type: v.deposit_type === "percent" || v.deposit_type === "fixed" ? v.deposit_type : "none",
    deposit_percent: typeof v.deposit_percent === "number" ? v.deposit_percent : 0,
    deposit_amount: typeof v.deposit_amount === "number" ? v.deposit_amount : 0,
  };
}

export function isWithinFreeCancellationWindow(checkInDate: string, policy: BookingPolicy, now: Date = new Date()): boolean {
  const checkIn = new Date(`${checkInDate}T00:00:00`);
  const hoursUntil = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil >= policy.cancellation_free_hours;
}

// Fees are a percentage of one night's rate — simple and matches how most
// small-property cancellation policies are actually written ("first night
// non-refundable inside 24h") rather than a percentage of the full stay.
export function computeCancellationFee(policy: BookingPolicy, ratePerNight: number): number {
  return Math.round(ratePerNight * policy.cancellation_fee_percent) / 100;
}

export function computeNoShowFee(policy: BookingPolicy, ratePerNight: number): number {
  return Math.round(ratePerNight * policy.no_show_fee_percent) / 100;
}

export function computeDepositAmount(policy: BookingPolicy, ratePerNight: number, nights: number): number {
  if (policy.deposit_type === "percent") return Math.round(ratePerNight * nights * policy.deposit_percent) / 100;
  if (policy.deposit_type === "fixed") return policy.deposit_amount;
  return 0;
}
