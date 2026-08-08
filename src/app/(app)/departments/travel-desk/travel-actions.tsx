"use client";

import { useTransition } from "react";
import { updateTravelBookingStatus } from "@/app/actions/travel-desk";
import { Select } from "@/components/ui";

type TravelStatus = "inquiry" | "scheduled" | "confirmed" | "completed" | "cancelled";

export function TravelStatusControl({ bookingId, status }: { bookingId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateTravelBookingStatus(bookingId, e.target.value as TravelStatus))}
      className="text-xs"
    >
      <option value="inquiry">Inquiry</option>
      <option value="scheduled">Scheduled</option>
      <option value="confirmed">Confirmed</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
    </Select>
  );
}
