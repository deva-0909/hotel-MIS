"use client";

import { useState, useTransition } from "react";
import { createEvent, updateEventStatus } from "@/app/actions/banquet";
import { Button, Input, Label, Select } from "@/components/ui";

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

export function NewEventForm({ venues }: { venues: { id: string; name: string; capacity: number }[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createEvent(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not book this event.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2 p-4">
      <div>
        <Label>Event name</Label>
        <Input name="event_name" required />
      </div>
      <div>
        <Label>Client</Label>
        <Input name="client_name" required />
      </div>
      <div>
        <Label>Venue</Label>
        <Select name="venue_id">
          <option value="">Select venue…</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} (cap. {v.capacity})
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Starts</Label>
          <Input name="start_at" type="datetime-local" required />
        </div>
        <div>
          <Label>Ends</Label>
          <Input name="end_at" type="datetime-local" required />
        </div>
      </div>
      <div>
        <Label>Covers</Label>
        <Input name="covers" type="number" min={0} />
      </div>
      <div>
        <Label>Value (₹)</Label>
        <Input name="value_amount" type="number" min={0} step="0.01" />
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Checking availability…" : "Book event"}
      </Button>
    </form>
  );
}
