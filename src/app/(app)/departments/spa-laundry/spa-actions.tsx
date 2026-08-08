"use client";

import { useTransition } from "react";
import { updateSpaBookingStatus, updateLaundryStatus } from "@/app/actions/spa-laundry";
import { Select } from "@/components/ui";

type SpaStatus = "booked" | "in_progress" | "completed" | "cancelled";
type LaundryStatus = "collected" | "in_process" | "ready" | "delivered";

export function SpaStatusControl({ bookingId, status }: { bookingId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateSpaBookingStatus(bookingId, e.target.value as SpaStatus))}
      className="text-xs"
    >
      <option value="booked">Booked</option>
      <option value="in_progress">In Progress</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
    </Select>
  );
}

export function LaundryStatusControl({ batchId, status }: { batchId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateLaundryStatus(batchId, e.target.value as LaundryStatus))}
      className="text-xs"
    >
      <option value="collected">Collected</option>
      <option value="in_process">In Process</option>
      <option value="ready">Ready</option>
      <option value="delivered">Delivered</option>
    </Select>
  );
}
