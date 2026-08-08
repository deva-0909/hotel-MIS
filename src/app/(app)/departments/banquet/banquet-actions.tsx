"use client";

import { useTransition } from "react";
import { updateEventStatus } from "@/app/actions/banquet";
import { Select } from "@/components/ui";

type EventStatus = "tentative" | "confirmed" | "completed" | "cancelled";

export function EventStatusControl({ eventId, status }: { eventId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateEventStatus(eventId, e.target.value as EventStatus))}
      className="text-xs"
    >
      <option value="tentative">Tentative</option>
      <option value="confirmed">Confirmed</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
    </Select>
  );
}
